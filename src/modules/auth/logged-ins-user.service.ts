import { Injectable } from '@nestjs/common';
import { User } from '../user/user.entity';

@Injectable()
export class LoggedInsUserService {
  private currentUser: User | null = null;

  setCurrentUser(user: User | null) {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  clearCurrentUser() {
    this.currentUser = null;
  }
}