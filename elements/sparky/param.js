import { cue, register } from '../../../sparky/module.js';
import { notify, observe, Target, getPath } from '../../../fn/module.js';
import { isAudioParam, automato__, getValueAtTime } from '../../module.js';

const DEBUG    = true;//window.DEBUG;
const assign   = Object.assign;
const fadeTime = 0.003;

function ParamRenderer(node, audioNode, name) {
    this.label          = "ParamRenderer"
    this.node           = node;
    this.audioNode      = audioNode;
    this.audioParam     = audioNode[name];
    this.audioParamName = name;

    if (DEBUG && !isAudioParam(this.audioParam)) {
        throw new Error('Property "' + name + '" is not an AudioParam');
    }

    // Set up param observer
    this.unobserve = observe(name, (value) => {
        // Param value observers are passed the value of the
        // param at the sound output time corresponding to the
        // DOM time of the frame + 16ms
        this.value = value;
        if (this.cued) { return; }
        this.cued = true;
        cue(this);
    }, audioNode, this.audioParam);

    // Immediately notify values.
    notify(this.audioNode, name, getValueAtTime(this.audioParam, 0));

    // Observe node
    node.addEventListener('input', (e) => {
        const t = this.audioNode.context.currentTime;
        automato__(this.audioNode, this.audioParamName, t, 'hold', null, null, notify);
        automato__(this.audioNode, this.audioParamName, t + fadeTime, 'linear', e.target.value, null, notify);
        //console.log('CHANGE', this.audioParamName, e.target.value)
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

register('param', function(node, params) {
    const parts = /(?:(.*)\.)?([\w\d-_$]+)$/.exec(params[0]);
    const path  = parts[1];
    const name  = parts[2];

    var renderer;

    return this.tap((object) => {
        // Path is just a property name currently. Todo: if we need it, get
        // a proper path. As it is, this is more better (quicker) for the time being.
        const target = Target(path ? getPath(path, object) : object);

        if (!target || !target.context) {
            throw new Error('fn="param" object at path "' + path + '" not an AudioNode');
        }

        if (!target[name]) {
            throw new Error('fn="param" AudioNode has no param "' + name + '"');
        }

        renderer && renderer.stop();
        renderer = new ParamRenderer(node, target, name);
    });
});
