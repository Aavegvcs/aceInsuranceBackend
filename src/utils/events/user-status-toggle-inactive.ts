import { User } from 'src/modules/user/user.entity';

// Class to return a Payload for the Client Intake Email Event
export class UserStatusToggleInActiveEvent {
    user: User;
    cookies: any;
    res: any;

    constructor(user: User, cookies: any, res: any) {
        this.user = user;
        this.cookies = cookies;
        this.res = res;
    }
}
