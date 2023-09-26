
import Stream, { frames }        from '../../../fn/modules/stream.js';
import { formatTime }            from '../../../fn/modules/time.js';
import observe                   from '../../../fn/observer/observe.js';
import Observer                  from '../../../fn/observer/observer.js';
import delegate                  from '../../../dom/modules/delegate.js';
import createBoolean             from '../../../dom/modules/element/create-boolean.js';
import createTokenList           from '../../../dom/modules/element/create-token-list.js';
import element, { getInternals } from '../../../dom/modules/element.js';
import events                    from '../../../dom/modules/events.js';
import request                   from '../../../dom/modules/request.js';
import { getSequenceDuration }   from '../../modules/sequencer/get-duration.js'
import Soundstage                from '../../modules/soundstage.js';


export default element('soundstage-player', {
    template: `
        <style>
        :host {
            font-family: system-ui;
            display: inline-flex;
            align-items: center;
            height: 3rem;
            padding-left: 0.125rem;
            padding-right: 0.625rem;
            background-color: #cccccc;
            border-radius: 1.5rem;
        }

        :host > [name="timeline"],
        :host > [name="metronome"],
        :host > time,
        :host > .duration {
            margin-left: 0.125rem;
        }

        :host > [name="timeline"] {
            margin-top: 0;
            margin-bottom: 0;
            margin-left: 0.25rem;
            margin-right: 0.25rem;
        }

        :host > .button {
            margin-left: 0.25rem;
        }

        button, .button {
            box-sizing: border-box;
            cursor: pointer;
            width: 0;
            border-width: 0;
            background: white;
        }

        time {
            font-size: 0.75rem;
            width: 2.25rem; /* Prevent layout jumping around as time changes */
            overflow: visible;
        }
        .time     { text-align: right; }
        .duration { text-align: left; }

        [name="start"] {
            padding: 0 0 0 2.75rem;
            height: 2.75rem;
            overflow: hidden;
            border-radius: 1.375rem;
            background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 12 12" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">\
                <path d="M4.4,3.2 L4.4,8.8 L8.8,6 Z"></path>\
            </svg>');
        }

        [name="start"].playing {
            background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 12 12" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">\
                <path d="M4,4 L4,8 L8,8 L8,4 Z"></path>\
            </svg>');
        }

        .button,
        [name="metronome"],
        [name="loop"] {
            padding: 0 0 0 2.5rem;
            height: 2.5rem;
            overflow: hidden;
        }

        .button {
            padding: 0 0 0 1.75rem;
            height: 1.75rem;
            border-radius: 0.875rem;
        }
        </style>

        <button type="button" name="start">Play</button>
        <time class="time">0:00</time>
        <input type="range" name="timeline" min="0" max="10" step="any" value="0" />
        <time class="duration">0:00</time>
        <button type="button" name="metronome" title="Toggle metronome">Metronome</button>
        <button type="button" name="loop" title="Toggle loop">Loop</button>
        <a class="button" href="https://stephen.band/soundstage/">About Soundstage</a>
    `,

    construct: function(shadow, internals) {
        // DOM
        const dom = {
            play:     shadow.querySelector('[name="start"]'),
            time:     shadow.querySelector('.time'),
            timeline: shadow.querySelector('[name="timeline"]'),
            duration: shadow.querySelector('.duration')
        };
        internals.dom = dom;

        // Soundstage data
        var stage;
        internals.datas = Stream.of();
        internals.datas
        .map((data) => new Soundstage(data))
        .each((s) => {
            // TEMP
            stage = window.stage = internals.stage = s;
            //observe('startTime', stage).each((v) => console.log('DD', v));
            const duration = getSequenceDuration(stage);
            dom.timeline.max = duration;
            dom.duration.textContent = formatTime('m:ss', duration);
        });

        const updates = frames('frame').each((t) => {
            dom.time.textContent = formatTime('m:ss', stage.time);
            dom.timeline.value   = stage.time;
        });

        // Controls
        events('click', shadow)
        .each(delegate({
            '[name="start"]': (node) => {
                if (stage.status === 'playing') {
                    stage.stop();
                    updates.stop();
                    dom.play.textContent = 'Play';
                    dom.play.classList.remove('playing');
                    // TODO: Stop other instances of soundstage-player?
                }
                else {
                    stage.start();
                    updates.start();
                    dom.play.textContent = 'Stop';
                    dom.play.classList.add('playing');
                }
            },

            '[name="metronome"]': (node) => stage.metronome = !stage.metronome,
            '[name="loop"]':      (node) => stage.loop = !stage.looop
        }));

        events('input', shadow)
        .each(delegate({
            '[name="timeline"]': (node) => {
                const time = parseFloat(node.value);
                stage.time = time;
                // This should update in reponse to data, not in response to input
                dom.time.textContent = formatTime('m:ss', time);
            }
        }));
    }
}, {
    /**
    controls=""
    An attribute that accepts the tokens `"navigation"`, `"pagination"`
    and `"fullscreen"`. The presence of one of these tokens enables the
    corresponding controls.

    ```html
    <slide-show controls="navigation fullscreen">…</slide-show>
    ```
    **/

    /**
    .controls
    A TokenList object (like `.classList`) that supports the tokens
    `"navigation"`, `"pagination"` and `"fullscreen"`.

    ```js
    slideshow.controls.add('pagination');
    ```
    **/

    controls: createTokenList({
        'play': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        },

        'time': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        },

        'meter': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        },

        'tempo': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        },

        'metronome': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        },

        'info': {
            enable:   function() {},
            disable:  function() {},
            getState: function() {}
        }
    }),

    start: {
        value: function() {

        }
    },

    stop: {
        value: function() {

        }
    },

    duration: {
        get: function() {}
    },

    playing: {
        get: function() {}
    },

    loop: {
        attribute: function() {},
        get: function() {},
        set: function() {}
    },

    /**
    src=""
    A path to a Soundstage JSON file.

    ```html
    <soundstage-player src="./tune.json">...</soundstage-player>
    ```
    **/

    src: {
        attribute: function(value) { this.src = value; },
        get: function() { return getInternals(this).src; },
        set: function(value) {
            const internals = getInternals(this);
            internals.src = value;

            // Add loading indication
            internals.dom.play.classList.add('loading');

            request('get', value, 'application/json')
            // Push data into datas stream
            .then((data) => internals.datas.push(data))
            // Remove loading indication
            .finally(() => internals.dom.play.classList.remove('loading'));
        }
    },
});
