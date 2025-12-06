/*
    getty - The platform tools for live streaming on Odysee.
    Copyright (C) 2025 gettyteam

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const serverRuntime = require('./createServer');

if (process.env.NODE_ENV !== 'test') {
  serverRuntime.startServer();
}

const app = serverRuntime.app;

module.exports = app;
module.exports.app = app;
module.exports.createServer = serverRuntime.createServer;
module.exports.startServer = serverRuntime.startServer;
module.exports.wss = serverRuntime.wss;
module.exports.store = serverRuntime.store;
module.exports.historyStore = serverRuntime.historyStore;
module.exports.connectOBS = serverRuntime.connectOBS;
module.exports.getHttpServer = serverRuntime.getHttpServer;
module.exports.runtime = serverRuntime;
