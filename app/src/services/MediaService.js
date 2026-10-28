import { badRequest, notFound } from '../errors.js';
import { int, text } from '../validate.js';
import { MediaStorage } from './MediaStorage.js';

export class MediaService {
  /**
   * @param {import('../db/repositories/Repositories.js').Repositories} repos
   * @param {MediaStorage} storage
   * @param {import('./PinService.js').PinService} pins used for ownership checks
   */
  constructor(repos, storage, pins) {
    this.media = repos.media;
    this.storage = storage;
    this.pins = pins;
  }

  /** Called before the upload middleware so nothing is written for pins the user may not edit. */
  assertCanUpload(pinId, user) {
    return this.pins.findEditable(pinId, user);
  }

  async addUploaded(pinId, files, caption) {
    if (!files?.length) throw badRequest('Geen bestanden ontvangen');
    try {
      const last = await this.media.findAll({ pin_id: pinId }, { orderBy: ['-sort_order'], limit: 1 });
      const start = (last[0]?.sort_order ?? -1) + 1;
      return await this.media.insertMany(files.map((file, i) => ({
        pin_id: pinId,
        kind: MediaStorage.kindOf(file.mimetype),
        file_name: this.storage.relativeName(pinId, file),
        original_name: file.originalname.slice(0, 255),
        mime: file.mimetype,
        size: file.size,
        caption: text(caption, 'Bijschrift', { max: 500 }),
        sort_order: start + i,
      })));
    } catch (err) {
      await Promise.all(files.map((f) => this.storage.removeFile(this.storage.relativeName(pinId, f))));
      throw err;
    }
  }

  async findEditable(mediaId, user) {
    const item = await this.media.findById(mediaId);
    if (!item) throw notFound('Bestand niet gevonden');
    await this.pins.findEditable(item.pin_id, user);
    return item;
  }

  async update(mediaId, body, user) {
    await this.findEditable(mediaId, user);
    return this.media.updateById(mediaId, {
      caption: body.caption === undefined ? undefined : text(body.caption, 'Bijschrift', { max: 500 }),
      sort_order: int(body.sort_order, 'Volgorde', { min: 0, max: 10000 }) ?? undefined,
    });
  }

  async remove(mediaId, user) {
    const item = await this.findEditable(mediaId, user);
    await this.media.deleteById(mediaId);
    await this.storage.removeFile(item.file_name);
  }
}
