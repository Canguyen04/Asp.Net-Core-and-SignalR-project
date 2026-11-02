import * as signalR from '@microsoft/signalr';
import { HUB_URL } from './config';

let connection = null;
let identity = null;
let startPromise = null;
const listeners = new Set();
const dispatch = (data) => listeners.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

export async function disconnectRealtime() {
  const old = connection;
  connection = null;
  identity = null;
  startPromise = null;
  if (old) { try { await old.stop(); } catch (e) { console.warn(e); } }
}
function connect(userInfo) {
  const key = `${userInfo.user_id}:${userInfo.access_token}`;
  if (connection && identity === key) return;
  if (connection) void disconnectRealtime();
  identity = key;
  const instance = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => {
      try { return JSON.parse(localStorage.getItem('userInfo') || 'null')?.access_token || ''; } catch { return ''; }
    }})
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
  connection = instance;
  instance.on('OrderCreated', order => dispatch({ event: 'order_created', order }));
  instance.on('OrderUpdated', order => dispatch({ event: 'status_changed', order }));
  instance.on('NewChatMessage', data => dispatch({ event: 'new_chat_message', ...data }));
  instance.on('AccountStatusChanged', data => {if(!data.isActive){void disconnectRealtime();localStorage.removeItem('userInfo');window.location.assign('/login');}});
  instance.on('RealtimeEvent', data => dispatch({ event: data.eventName, ...data }));
  const attemptStart = async () => {
    if (connection !== instance) return;
    try { await instance.start(); }
    catch(err) {
      console.warn('SignalR chưa kết nối; sẽ thử lại:', err.message);
      setTimeout(() => { if(connection === instance && instance.state===signalR.HubConnectionState.Disconnected) startPromise=attemptStart(); }, 5000);
    }
  };
  startPromise = attemptStart();
}
export function subscribeRealtime(userInfo, listener) {
  if (!userInfo?.access_token) return () => {};
  listeners.add(listener);
  connect(userInfo);
  return () => listeners.delete(listener);
}
export async function joinOrder(id) {
  if (startPromise) await startPromise;
  if (connection?.state === signalR.HubConnectionState.Connected) {
    try { await connection.invoke('JoinOrder', Number(id)); } catch (err) { console.warn(err); }
  }
}
