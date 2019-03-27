import { cue, functions, transforms } from '../../../../sparky/sparky.js';
import { notify, observe, Target } from '../../../../fn/fn.js';
import { getValueAtTime, timeAtDomTime, isAudioParam, automate } from '../../../soundstage.js';

const DEBUG    = true;//window.DEBUG;
const assign   = Object.assign;
const fadeTime = 0.0025;

function ParamRenderer(node, audioNode, name) {
    this.node           = node;
    this.audioNode      = audioNode;
    this.audioParam     = audioNode[name];
    this.audioParamName = name;

    if (DEBUG && !isAudioParam(this.audioParam)) {
        //console.warn('Property "' + name + '" is not an AudioParam', this.audioNode);
        //return false;
        throw new Error('Property "' + name + '" is not an AudioParam');
    }

    // Observe data
    this.unobserve = observe(name + '.value', (value) => {
        // Param value observers are passed the value of the
        // param at the sound output time corresponding to the
        // DOM time of the frame + 16ms
        this.renderValue = value;
        if (this.cued) { return; }
        this.cued = true;
        cue(this);
    }, audioNode, NaN);

    // Observe node
    node.addEventListener('input', (e) => {
        const t = this.audioNode.context.currentTime;
        automate(this.audioParam, t, 'hold', null, null, notify, audioNode.context);
        automate(this.audioParam, t + fadeTime, 'linear', e.target.value, null, notify, audioNode.context);
    });
}

assign(ParamRenderer.prototype, {
    render: function() {
        this.cued = false;

        if (this.node.value !== this.renderValue) {
            this.node.value = this.renderValue;
        }

        // Return DOM mutation count
        return 1;
    },

    stop: function() {
        this.unobserve();
    }
});

functions.param = function(node, scopes, params) {
    var renderer;
    const audioParamName = params[0];

    return scopes.tap((graphNode) => {
        const target = Target(graphNode.data);
        renderer && renderer.stop();
        renderer = target && target[audioParamName] && new ParamRenderer(node, target, audioParamName);
    });
}
