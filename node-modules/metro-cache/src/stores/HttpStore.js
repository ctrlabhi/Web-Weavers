/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *
 */

"use strict";

const HttpError = require("./HttpError");
const NetworkError = require("./NetworkError");
const http = require("http");
const https = require("https");
const url = require("url");
const zlib = require("zlib");
const ZLIB_OPTIONS = {
  level: 9,
};
const NULL_BYTE = 0x00;
const NULL_BYTE_BUFFER = Buffer.from([NULL_BYTE]);
class HttpStore {
  static HttpError = HttpError;
  static NetworkError = NetworkError;
  constructor(options) {
    const uri = url.parse(options.endpoint);
    const module = uri.protocol === "http:" ? http : https;
    const agentConfig = {
      family: options.family,
      keepAlive: true,
      keepAliveMsecs: options.timeout || 5000,
      maxSockets: 64,
      maxFreeSockets: 64,
    };
    if (options.key != null) {
      // $FlowFixMe `key` is missing in the Flow definition
      agentConfig.key = options.key;
    }
    if (options.cert != null) {
      // $FlowFixMe `cert` is missing in the Flow definition
      agentConfig.cert = options.cert;
    }
    if (options.ca != null) {
      // $FlowFixMe `ca` is missing in the Flow definition
      agentConfig.ca = options.ca;
    }
    if (!uri.hostname || !uri.pathname) {
      throw new TypeError("Invalid endpoint: " + options.endpoint);
    }
    this._module = module;
    this._timeout = options.timeout || 5000;
    this._host = uri.hostname;
    this._path = uri.pathname;
    this._port = +uri.port;
    this._getAgent = new module.Agent(agentConfig);
    this._setAgent = new module.Agent(agentConfig);
  }
  get(key) {
    return new Promise((resolve, reject) => {
      const options = {
        agent: this._getAgent,
        host: this._host,
        method: "GET",
        path: this._path + "/" + key.toString("hex"),
        port: this._port,
        timeout: this._timeout,
      };

      /* $FlowFixMe(>=0.101.0 site=react_native_fb) This comment suppresses an
       * error found when Flow v0.101 was deployed. To see the error, delete
       * this comment and run Flow. */
      const req = this._module.request(options, (res) => {
        const code = res.statusCode;
        const data = [];
        if (code === 404) {
          res.resume();
          resolve(null);
          return;
        } else if (code !== 200) {
          res.resume();
          reject(new HttpError("HTTP error: " + code, code));
          return;
        }
        const gunzipped = res.pipe(zlib.createGunzip());
        gunzipped.on("data", (chunk) => {
          data.push(chunk);
        });
        gunzipped.on("error", (err) => {
          reject(err);
        });
        gunzipped.on("end", () => {
          try {
            const buffer = Buffer.concat(data);
            if (buffer.length > 0 && buffer[0] === NULL_BYTE) {
              resolve(buffer.slice(1));
            } else {
              resolve(JSON.parse(buffer.toString("utf8")));
            }
          } catch (err) {
            reject(err);
          }
        });
        res.on("error", (err) => gunzipped.emit("error", err));
      });
      req.on("error", (err) => {
        reject(new NetworkError(err.message, err.code));
      });
      req.on("timeout", () => {
        req.destroy(new Error("Request timed out"));
      });
      req.end();
    });
  }
  set(key, value) {
    return new Promise((resolve, reject) => {
      const gzip = zlib.createGzip(ZLIB_OPTIONS);
      const options = {
        agent: this._setAgent,
        host: this._host,
        method: "PUT",
        path: this._path + "/" + key.toString("hex"),
        port: this._port,
        timeout: this._timeout,
      };

      /* $FlowFixMe(>=0.101.0 site=react_native_fb) This comment suppresses an
       * error found when Flow v0.101 was deployed. To see the error, delete
       * this comment and run Flow. */
      const req = this._module.request(options, (res) => {
        const code = res.statusCode;
        if (code < 200 || code > 299) {
          res.resume();
          reject(new HttpError("HTTP error: " + code, code));
          return;
        }
        res.on("error", (err) => {
          reject(err);
        });
        res.on("end", () => {
          resolve();
        });

        // Consume all the data from the response without processing it.
        res.resume();
      });
      req.on("timeout", () => {
        req.destroy(new Error("Request timed out"));
      });
      gzip.pipe(req);
      if (value instanceof Buffer) {
        gzip.write(NULL_BYTE_BUFFER);
        gzip.end(value);
      } else {
        gzip.end(JSON.stringify(value) || "null");
      }
    });
  }
  clear() {
    // Not implemented.
  }
}
module.exports = HttpStore;
