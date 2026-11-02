import React,{useEffect,useRef,useState} from 'react';
import {api} from '../api';
import {subscribeRealtime} from '../realtime';
import {Icon} from '../ui/kit';
export default function SupportWidget({userInfo}){
 const [open,setOpen]=useState(false),[messages,setMessages]=useState([]),[input,setInput]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState('');const end=useRef(null);
 const load=async()=>{try{const {data}=await api.get(`/support/${userInfo.user_id}/messages`);setMessages(data);setError('')}catch(e){setError('Chưa thể tải tin nhắn hỗ trợ.')}};
 useEffect(()=>{if(open)load()},[open]);
 useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'})},[messages,open]);
 useEffect(()=>subscribeRealtime(userInfo,d=>{if(d.event==='new_support_msg'&&open)load()}),[open,userInfo.user_id]);
 const send=async e=>{e.preventDefault();if(!input.trim()||sending)return;setSending(true);try{await api.post('/support/messages',{content:input.trim()});setInput('');await load()}catch{setError('Không gửi được tin nhắn, hãy thử lại.')}finally{setSending(false)}};
 return <div className="support-widget">{!open?<button type="button" className="support-fab" onClick={()=>setOpen(true)} aria-label="Mở hỗ trợ khách hàng"><Icon name="message" size={24}/><span className="support-fab-label">Hỗ trợ trực tuyến</span></button>:<section className="support-panel" aria-label="Hỗ trợ trực tuyến"><header className="support-head"><span className="support-head-avatar"><Icon name="message" size={20}/></span><div><b>Trung tâm hỗ trợ</b><small><span className="online-dot"/> Kết nối trực tuyến</small></div><button type="button" className="support-close" aria-label="Đóng hội thoại" onClick={()=>setOpen(false)}><Icon name="x" size={19}/></button></header><div className="support-history">{messages.length===0&&<div className="text-center text-muted small py-4">Chào bạn! Hãy gửi câu hỏi để được hỗ trợ.</div>}{messages.map((m,i)=>{const me=m.sender_type==='user';return <div key={m.id||i} className={`d-flex mb-3 ${me?'justify-content-end':'justify-content-start'}`}><div className={`support-bubble ${me?'mine':''}`}>{m.content}</div></div>})}<div ref={end}/></div>{error&&<p className="small text-danger px-3 m-0">{error}</p>}<form className="support-compose" onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Nhập nội dung cần hỗ trợ..." aria-label="Nội dung tin nhắn"/><button className="btn btn-orange" type="submit" disabled={!input.trim()||sending}><Icon name="arrow" size={18}/></button></form></section>}</div>
}
