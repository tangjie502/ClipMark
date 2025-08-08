//
//  SafariWebExtensionHandler.swift
//  MarkDownload - Markdown Web Clipper Extension
//
//  Created by Gordon Pedersen on 17/2/21.
//

import SafariServices
import os.log

let SFExtensionMessageKey = "message"

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

	func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as! NSExtensionItem
        let message = item.userInfo?[SFExtensionMessageKey]
        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@", message as! CVarArg)

        let response = NSExtensionItem()
        
        // Handle different message types from ClipMark extension
        if let messageDict = message as? [String: Any] {
            switch messageDict["type"] as? String {
            case "download-complete":
                response.userInfo = [ SFExtensionMessageKey: [ "status": "success", "message": "Download completed" ] ]
            case "error":
                response.userInfo = [ SFExtensionMessageKey: [ "status": "error", "message": "Processing error" ] ]
            default:
                response.userInfo = [ SFExtensionMessageKey: [ "status": "received", "response": "Message processed by Safari extension" ] ]
            }
        } else {
            response.userInfo = [ SFExtensionMessageKey: [ "Response to": message ] ]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
    
}
