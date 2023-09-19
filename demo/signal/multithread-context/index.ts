import {AlwatrMultithreadContextSignal} from '@alwatr/signal';

import './main.js';

const worker = new Worker('./worker.js', {type: 'module'});
AlwatrMultithreadContextSignal.setupChannel(worker);
