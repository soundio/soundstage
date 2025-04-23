import get         from 'fn/get.js';
import overload    from 'fn/overload.js';
import Stream      from 'fn/stream/stream.js';
import StageObject from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = {};


/* Harmoniser */

export default class Harmoniser extends StageObject {
    constructor(transport, settings = {}) {
        const inputs = {
            0: Stream.each(overload(get(1), {
                noteon: function(noteon) {
                    const { events, harmonies, shadowRoot } = getInternals(this);
                    events.push(noteon);

                    /* TEMP */
                    /*const svg = shadowRoot.querySelector('svg');
                    selectHarmonies(this, svg, harmonies, noteon[2]);*/
                },

                noteoff: function(noteoff) {
                    const { events, outputs } = getInternals(this);

                    // Remove matching note
                    const i = events.findIndex((event) => isNoteStart(event) && event[2] === noteoff[2]);

                    // No matching noteon found. Shouldn't happen unless something
                    // got initialised while a note was on. Push it thru anyway.
                    if (i === -1) {
                        this.outputs[0] && this.outputs[0].push(noteoff);

                        return;
                    }

                    const noteon = events[i];
                    if (noteon.sustained) noteon.sustained = 2;
                    else events.splice(i, 1);
                },

                /*pitch: function(message) {
                    const { notes, shadowRoot } = getInternals(this);
                    const bend = this.range * toSignedFloat(message);

                    let n = -1;
                    let note, originalPitch;

                    while (note = notes[++n]) if (toChannel(note.message) === toChannel(message)) {
                        const pitch = note.pitchStart + bend;
                        const oldPitch = Math.round(note.pitch);
                        const newPitch = Math.round(pitch);

                        note.pitch = pitch;

                        // TEMP. Move this
                        if (newPitch !== oldPitch) {
                            const svgRegions = shadowRoot.getElementById('regions');
                            svgRegions.querySelectorAll('.highlight').forEach((node) => node.classList.remove('highlight'));
                            notes.forEach((note) => svgRegions.querySelector('[data-pitch="' + toNoteName(Math.round(note.pitch)).replace(/\d/, ($0) => '-' + $0) + '"]').classList.add('highlight'));
                        }

                        // TEMP. Move this
                        const xy = numberToXY(note.pitch);
                        assignAttributes(note.element, { cx: xy[0], cy: xy[1] });
                    };
                },*/

                default: (event) => {
                    this.outputs[0] && this.outputs[0].push(event);
                }
            })),

            size: 1
        };

        const outputs = { size: 8 };

        // extends StageObject
        super(transport, inputs, outputs);
        //this.data = data;
    }
}
