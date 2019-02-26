import { cue, functions, transforms } from '../../../../sparky/sparky.js';
import { observe, notify } from '../../../../fn/fn.js';
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
        console.warn('Audio param "' + name + '" not a property of audio node', this.audioNode);
        return false;
        throw new Error('Audio param "' + name + '" not a property of audio node');
    }

    // Observe data
    this.unobserve = observe(name + '.value', (value) => {
        // Param value observers are passed the value of the
        // param at the sound output time corresponding to the
        // DOM time of the frame + 16ms
        this.renderValue = value;
        cue(this)
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
        this.node.value = this.renderValue;
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

    return scopes.tap((audioNode) => {
        renderer && renderer.stop();
        renderer = audioNode && audioNode[audioParamName] && new ParamRenderer(node, audioNode, audioParamName);
    });
}
