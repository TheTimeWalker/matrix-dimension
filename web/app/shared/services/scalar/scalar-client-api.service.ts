import { Injectable } from "@angular/core";
import * as randomString from "random-string";
import {
    CanSendEventResponse,
    JoinRuleStateResponse,
    MembershipStateResponse,
    RoomEncryptionStatusResponse,
    ScalarSuccessResponse,
    ScalarWidget,
    SetPowerLevelResponse,
    WidgetsResponse
} from "../../models/server-client-responses";
import { EditableWidget } from "../../models/widget";

@Injectable()
export class ScalarClientApiService {

    private static actionMap: { [key: string]: { resolve: (obj: any) => void, reject: (obj: any) => void } } = {};

    public static getAndRemoveActionHandler(requestKey: string): { resolve: (obj: any) => void, reject: (obj: any) => void } {
        let handler = ScalarClientApiService.actionMap[requestKey];
        ScalarClientApiService.actionMap[requestKey] = null;
        return handler;
    }

    constructor() {
    }

    public inviteUser(roomId: string, userId): Promise<ScalarSuccessResponse> {
        return this.callAction("invite", {
            room_id: roomId,
            user_id: userId
        });
    }

    public getMembershipState(roomId: string, userId: string): Promise<MembershipStateResponse> {
        return this.callAction("membership_state", {
            room_id: roomId,
            user_id: userId
        });
    }

    public getJoinRule(roomId: string): Promise<JoinRuleStateResponse> {
        return this.callAction("join_rules_state", {
            room_id: roomId
        });
    }

    public async getWidgets(roomId?: string): Promise<WidgetsResponse> {
        console.log("getWidgets start");
        let test = await this.callAction("get_widgets", {
            room_id: roomId
        });
        console.log(test);
        return test;
    }

    public setWidget(roomId: string, widget: EditableWidget): Promise<ScalarSuccessResponse> {
        return this.callAction("set_widget", {
            room_id: roomId,
            widget_id: widget.id,
            type: widget.type,
            url: widget.url,
            name: widget.name,
            data: widget.data
        });
    }

    public setUserWidget(widget: EditableWidget): Promise<ScalarSuccessResponse> {
        return this.callAction("set_widget", {
            userWidget: true,
            widget_id: widget.id,
            type: widget.type,
            url: widget.url,
            name: widget.name,
            data: widget.data
        });
    }

    public deleteWidget(roomId: string, widget: EditableWidget | ScalarWidget): Promise<ScalarSuccessResponse> {
        const anyWidget: any = widget;
        return this.callAction("set_widget", {
            room_id: roomId,
            widget_id: anyWidget.id || anyWidget.state_key,
            type: widget.type, // required for some reason
            url: ""
        });
    }

    public deleteUserWidget(widget: EditableWidget | ScalarWidget): Promise<ScalarSuccessResponse> {
        const anyWidget: any = widget;
        return this.callAction("set_widget", {
            userWidget: true,
            widget_id: anyWidget.id || anyWidget.state_key,
            type: widget.type, // required for some reason
            url: ""
        });
    }

    public close(): void {
        this.callAction("close_scalar", {});
    }

    public canSendEvent(roomId: string, eventType: string, isState: boolean): Promise<CanSendEventResponse> {
        return this.callAction("can_send_event", {
            room_id: roomId,
            event_type: eventType,
            is_state: isState,
        });
    }

    public isRoomEncrypted(roomId: string): Promise<RoomEncryptionStatusResponse> {
        return this.callAction("get_room_enc_state", {
            room_id: roomId,
        });
    }

    public setUserPowerLevel(roomId: string, userId: string, powerLevel: number): Promise<SetPowerLevelResponse> {
        return this.callAction("set_bot_power", {
            room_id: roomId,
            user_id: userId,
            level: powerLevel,
        });
    }

    private callAction(action, payload): Promise<any> {
        console.log("calling action");
        let requestKey = randomString({length: 20});
        return new Promise((resolve, reject) => {
            if (!window.opener) {
                // Mimic an error response from scalar
                reject({response: {error: {message: "No window.opener", _error: new Error("No window.opener")}}});
                return;
            }
            console.log("windows opener ok");

            ScalarClientApiService.actionMap[requestKey] = {
                resolve: resolve,
                reject: reject
            };

            console.log("creating request");
            let request = JSON.parse(JSON.stringify(payload));
            request["request_id"] = requestKey;
            request["action"] = action;

            console.log("let's postmessage");
            window.opener.postMessage(request, "*");
        });
    }
}

// Register the event listener here to ensure it gets created
window.addEventListener("message", event => {
    console.log("---------");
    console.log(event.data["request_id"]);
    console.log(event.data["action"]);
    console.log(JSON.stringify(event.data));
    console.log("---------");
    
    console.log("check data");
    if (!event.data || !event.data.response) return;

    console.log("check requestKey");
    let requestKey = event.data["request_id"];
    if (!requestKey) return;

    console.log("check action");
    let action = ScalarClientApiService.getAndRemoveActionHandler(requestKey);
    if (!action) return;

    if (event.data.response && event.data.response.error) {
        console.log("Shit");
        console.log(event.data.response.error);
        action.reject(event.data);
    }
    else action.resolve(event.data);
});
