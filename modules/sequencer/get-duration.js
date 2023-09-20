
import by   from '../../../fn/modules/by.js';
import get  from '../../../fn/modules/get.js';
import last from '../../../fn/modules/last.js';

import { getDuration as getEventDuration } from '../event.js';

const by0 = by(get(0));

export function getSequenceDuration(sequence) {
    // TODO: Account for tempo
    const lastEvent = last(sequence.events.sort(by0));
    return lastEvent[0] + getEventDuration(lastEvent);
}
