import { cue, functions } from '../../../../sparky/sparky.js';
import { notify, observe, Target } from '../../../../fn/fn.js';
import { isAudioParam, automate } from '../../../soundstage.js';

const DEBUG    = true;//window.DEBUG;
const assign   = Object.assign;
const fadeTime = 0.0025;

function ParamRenderer(node, audioNode, name) {
    this.label          = "ParamRenderer"
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
        this.value = value;
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
    fire: function() {
        this.cued = false;

        if (this.node.value !== this.value) {
            this.node.value = this.value;
        }

        this.renderedValue = this.value;
    },

    stop: function() {
        this.unobserve();
    },

    renderCount: 0
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
