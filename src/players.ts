import raw from './data/players.json';
import type {Player} from './engine';

// Prepared from documented Eredivisie appearances. See scripts/prepare_data.py.
export const players = raw as Player[];
