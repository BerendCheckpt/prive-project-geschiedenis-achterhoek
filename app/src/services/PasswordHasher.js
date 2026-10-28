import bcrypt from 'bcryptjs';

export class PasswordHasher {
  constructor({ rounds = 12 } = {}) {
    this.rounds = rounds;
  }

  hash(password) {
    return bcrypt.hash(password, this.rounds);
  }

  verify(password, hash) {
    return bcrypt.compare(password, hash);
  }
}
