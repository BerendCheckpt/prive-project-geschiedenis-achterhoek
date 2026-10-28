import { mkdir, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { badRequest } from '../errors.js';

/**
 * Stores uploaded media on the filesystem under <root>/<pinId>/<uuid>.<ext>.
 * The extension comes from an allow-list of MIME types, never from the uploaded file
 * name, so nothing executable (HTML, SVG, …) can be served from /media.
 */
export class MediaStorage {
  static EXTENSIONS = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
    'audio/mpeg': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav', 'audio/x-wav': '.wav',
    'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/aac': '.aac', 'audio/webm': '.weba',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv', 'video/quicktime': '.mov',
  };

  constructor(rootDir, { maxBytes = 200 * 1024 * 1024, maxFiles = 20 } = {}) {
    this.rootDir = rootDir;
    this.maxBytes = maxBytes;
    this.maxFiles = maxFiles;
  }

  static kindOf(mime) {
    return mime.split('/')[0]; // image | audio | video, guaranteed by the allow-list
  }

  /** Express middleware that writes up to maxFiles files from field `files` for pin req.params.id. */
  uploadMiddleware() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(this.rootDir, String(Number(req.params.id)));
        mkdir(dir, { recursive: true }).then(() => cb(null, dir), cb);
      },
      filename: (req, file, cb) => cb(null, randomUUID() + MediaStorage.EXTENSIONS[file.mimetype]),
    });
    return multer({
      storage,
      limits: { fileSize: this.maxBytes, files: this.maxFiles },
      fileFilter: (req, file, cb) => (MediaStorage.EXTENSIONS[file.mimetype]
        ? cb(null, true)
        : cb(badRequest(`Bestandstype ${file.mimetype} wordt niet ondersteund`))),
    }).array('files', this.maxFiles);
  }

  /** Path relative to the media root, as stored in media.file_name and served under /media. */
  relativeName(pinId, file) {
    return `${pinId}/${file.filename}`;
  }

  removeFile(fileName) {
    const full = path.resolve(this.rootDir, fileName);
    if (!full.startsWith(path.resolve(this.rootDir) + path.sep)) return Promise.resolve();
    return rm(full, { force: true });
  }

  removePin(pinId) {
    return rm(path.join(this.rootDir, String(Number(pinId))), { recursive: true, force: true });
  }
}
