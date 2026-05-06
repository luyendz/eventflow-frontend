import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// ── API ───────────────────────────────────────────────────────────────────────
const req = async (method, path, body, token) => {
  try {
    const r = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return r.json();
  } catch { return { error: true }; }
};
const api = {
  get: (path, token) => req("GET", path, null, token),
  post: (path, body, token) => req("POST", path, body, token),
  put: (path, body, token) => req("PUT", path, body, token),
  del: (path, token) => req("DELETE", path, null, token),
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const COLORS = ["#FF6B35","#00C896","#FF3D8B","#7C4DFF","#FFB400","#00B4D8","#FF6584","#43E97B"];
const CATEGORIES = ["Hội nghị","Workshop","Tiệc","Thể thao","Văn hóa","Công nghệ","Giáo dục","Khác"];
const CAT_ICONS = {"Hội nghị":"🎤","Workshop":"🛠","Tiệc":"🎉","Thể thao":"⚽","Văn hóa":"🎭","Công nghệ":"💻","Giáo dục":"📚","Khác":"📌"};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmtDate = dt => new Date(dt).toLocaleString("vi-VN",{dateStyle:"medium",timeStyle:"short"});
const fmtAgo = ts => { const s=Math.floor((Date.now()-ts)/1000); if(s<60) return "vừa xong"; if(s<3600) return `${Math.floor(s/60)} phút trước`; if(s<86400) return `${Math.floor(s/3600)} giờ trước`; return `${Math.floor(s/86400)} ngày trước`; };
const initials = n => (n||"?").trim().split(" ").map(w=>w[0]).slice(-2).join("").toUpperCase();
const aColor = id => COLORS[(id||0) % COLORS.length];
const genOTP = () => String(Math.floor(100000+Math.random()*900000));

// ── STYLES ────────────────────────────────────────────────────────────────────
const S = {
  inp: { width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"0.55rem",padding:"0.65rem 0.9rem",color:"#fff",fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box" },
  btn: (bg,c="#fff",p="0.6rem 1.1rem") => ({ background:bg,border:"none",borderRadius:"0.55rem",padding:p,color:c,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:"0.82rem",transition:"opacity 0.15s" }),
  tag: (bg,c) => ({ display:"inline-flex",alignItems:"center",gap:"0.3rem",background:bg,color:c,fontSize:"0.68rem",padding:"0.2rem 0.65rem",borderRadius:"99px",fontWeight:700 }),
  card: { background:"#0E0E1C",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"1rem",padding:"1.25rem" },
  lb: { fontSize:"0.7rem",color:"#555",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.06em",display:"block" },
};

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Av({ name, id, size=36, avatar }) {
  const c = aColor(id);
  if (avatar) return <img src={avatar} alt={name} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:`2px solid ${c}66`,flexShrink:0}}/>;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`${c}25`,border:`2px solid ${c}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.33,fontWeight:700,color:c,flexShrink:0}}>{initials(name)}</div>;
}

function Toast({ msg, type }) {
  return <div style={{position:"fixed",bottom:"1.5rem",left:"50%",transform:"translateX(-50%)",background:type==="err"?"#1a0808":"#081a10",border:`1px solid ${type==="err"?"#ff6b6b44":"#00c89644"}`,color:type==="err"?"#ff9999":"#00C896",padding:"0.7rem 1.5rem",borderRadius:"99px",fontSize:"0.85rem",fontWeight:600,zIndex:9999,boxShadow:"0 8px 24px #0008",whiteSpace:"nowrap"}}>{msg}</div>;
}

function Modal({ title, onClose, children, maxW=500 }) {
  useEffect(() => { const h = e => e.key==="Escape"&&onClose(); window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h); },[onClose]);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,padding:"1rem"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{...S.card,width:"100%",maxWidth:maxW,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.1rem"}}>
          <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",color:"#fff"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:"1.4rem",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ lb, type="text", val, onChange, ph, readOnly }) {
  return (
    <div>
      <label style={S.lb}>{lb}</label>
      <input type={type} value={val} onChange={e=>onChange&&onChange(e.target.value)} placeholder={ph||""} readOnly={readOnly} style={{...S.inp,colorScheme:"dark",opacity:readOnly?0.5:1}}/>
    </div>
  );
}

// ── OTP BOX ───────────────────────────────────────────────────────────────────
function OTPBox({ email, otp, demo, onExpire }) {
  const [secs, setSecs] = useState(300);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => { if(s<=1){clearInterval(t);onExpire&&onExpire();return 0;} return s-1; }), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(secs/60)).padStart(2,"0"), ss = String(secs%60).padStart(2,"0");
  return (
    <div style={{background:"linear-gradient(135deg,rgba(255,107,53,0.08),rgba(255,61,139,0.05))",border:"1px solid rgba(255,107,53,0.2)",borderRadius:"0.85rem",padding:"1rem",marginBottom:"0.9rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.75rem"}}>
        <div style={{width:32,height:32,background:"rgba(255,107,53,0.15)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>✉️</div>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.78rem",fontWeight:600,color:"#ddd"}}>{demo?"Email giả lập (demo)":"📧 Email đã gửi tới"}</div>
          <div style={{fontSize:"0.7rem",color:"#666"}}>{email}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"monospace",fontSize:"1.1rem",fontWeight:800,color:secs<60?"#FF3D8B":"#FF6B35"}}>{mm}:{ss}</div>
          <div style={{fontSize:"0.6rem",color:"#555"}}>còn lại</div>
        </div>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:99,marginBottom:"0.8rem",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(secs/300)*100}%`,background:"linear-gradient(90deg,#FF6B35,#FF3D8B)",transition:"width 1s linear"}}/>
      </div>
      {demo ? (!show
        ? <div style={{textAlign:"center"}}><button onClick={()=>setShow(true)} style={{...S.btn("rgba(255,107,53,0.12)","#FF6B35","0.4rem 1rem"),border:"1px dashed rgba(255,107,53,0.3)",fontSize:"0.75rem"}}>👁 Xem mã OTP</button></div>
        : <div style={{fontFamily:"monospace",fontSize:"2rem",fontWeight:800,letterSpacing:"0.35em",color:"#FF6B35",textAlign:"center"}}>{otp}</div>)
        : <div style={{textAlign:"center",fontSize:"0.78rem",color:"#888"}}>Kiểm tra hộp thư email của bạn 📧</div>
      }
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function Auth({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [lf, setLf] = useState({email:"",password:""});
  const [rf, setRf] = useState({name:"",email:"",password:"",confirm:""});
  const [ff, setFf] = useState({email:""});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [step, setStep] = useState(1);
  const [fStep, setFStep] = useState(1);
  const [fOtpData, setFOtpData] = useState(null);
  const [fInput, setFInput] = useState("");
  const [newPw, setNewPw] = useState({pw:"",confirm:""});

  const sw = t => { setTab(t);setErr("");setStep(1);setFStep(1);setOtpData(null);setFOtpData(null);setOtpInput("");setFInput(""); };

  const doLogin = async () => {
    setLoading(true); setErr("");
    const res = await api.post("/api/auth/login", lf);
    setLoading(false);
    if (!res.token) return setErr(res.message||"Lỗi đăng nhập");
    localStorage.setItem("ef_token", res.token);
    localStorage.setItem("ef_user", JSON.stringify(res.user));
    onLogin(res.user, res.token);
  };

  const sendOtp = async () => {
    if (!rf.name||!rf.email||!rf.password||!rf.confirm) return setErr("Điền đầy đủ thông tin.");
    if (rf.password.length<6) return setErr("Mật khẩu ít nhất 6 ký tự.");
    if (rf.password!==rf.confirm) return setErr("Mật khẩu không khớp.");
    setLoading(true); setErr("");
    const res = await api.post("/api/auth/send-otp", {email:rf.email,type:"register"});
    setLoading(false);
    if (res.error || !res.otp) return setErr(res.message || "Không thể gửi mã OTP. Vui lòng thử lại.");
    setOtpData({otp:res.otp,demo:res.demo});
    setStep(2);
  };

  const verifyOtp = async () => {
    setLoading(true); setErr("");
    const res = await api.post("/api/auth/register", {name:rf.name,email:rf.email,password:rf.password,otp:otpInput});
    setLoading(false);
    if (!res.token) return setErr(res.message||"OTP không đúng");
    localStorage.setItem("ef_token", res.token);
    localStorage.setItem("ef_user", JSON.stringify(res.user));
    onLogin(res.user, res.token);
  };

  const sendForgot = async () => {
    setLoading(true); setErr("");
    const res = await api.post("/api/auth/send-otp", {email:ff.email,type:"forgot"});
    setLoading(false);
    if (res.message?.includes("không")) return setErr(res.message);
    setFOtpData({otp:res.otp,demo:res.demo}); setFStep(2);
  };

  const resetPw = async () => {
    if (newPw.pw.length<6) return setErr("Mật khẩu ít nhất 6 ký tự.");
    if (newPw.pw!==newPw.confirm) return setErr("Mật khẩu không khớp.");
    setLoading(true);
    await api.post("/api/auth/reset-password", {email:ff.email,otp:fInput,newPassword:newPw.pw});
    setLoading(false); sw("login");
  };

  return (
    <div style={{minHeight:"100vh",background:"#060610",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Sora',sans-serif",padding:"1rem"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{width:56,height:56,background:"linear-gradient(135deg,#FF6B35,#FF3D8B)",borderRadius:"1.1rem",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",margin:"0 auto 0.9rem",boxShadow:"0 8px 32px rgba(255,107,53,0.3)"}}>📅</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",color:"#fff",margin:"0 0 0.3rem",fontSize:"2rem"}}>EventFlow</h1>
          <p style={{color:"#444",fontSize:"0.82rem",margin:0}}>Kết nối & quản lý sự kiện</p>
        </div>

        {tab!=="forgot" && (
          <div style={{display:"flex",background:"rgba(255,255,255,0.05)",borderRadius:"0.7rem",padding:"0.28rem",marginBottom:"1.4rem"}}>
            {[["login","Đăng nhập"],["register","Đăng ký"]].map(([t,l]) => (
              <button key={t} onClick={()=>sw(t)} style={{flex:1,padding:"0.5rem",border:"none",borderRadius:"0.5rem",background:tab===t?"linear-gradient(135deg,#FF6B35,#FF3D8B)":"transparent",color:tab===t?"#fff":"#555",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:"0.83rem"}}>{l}</button>
            ))}
          </div>
        )}

        {tab==="login" && (
          <div style={{display:"grid",gap:"0.85rem"}}>
            <Field lb="Email" type="email" val={lf.email} onChange={v=>setLf(f=>({...f,email:v}))}/>
            <Field lb="Mật khẩu" type="password" val={lf.password} onChange={v=>setLf(f=>({...f,password:v}))}/>
            {err && <div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}
            <button onClick={doLogin} disabled={loading} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem",opacity:loading?0.7:1}}>{loading?"Đang đăng nhập...":"Đăng nhập"}</button>
            <div style={{textAlign:"right"}}><button onClick={()=>sw("forgot")} style={{background:"none",border:"none",color:"#555",fontSize:"0.79rem",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Quên mật khẩu?</button></div>
          </div>
        )}

        {tab==="register" && (
          <div style={{display:"grid",gap:"0.85rem"}}>
            {step===1 && <>
              <Field lb="Họ và tên" val={rf.name} onChange={v=>setRf(f=>({...f,name:v}))}/>
              <Field lb="Email" type="email" val={rf.email} onChange={v=>setRf(f=>({...f,email:v}))}/>
              <Field lb="Mật khẩu" type="password" val={rf.password} onChange={v=>setRf(f=>({...f,password:v}))}/>
              <Field lb="Xác nhận mật khẩu" type="password" val={rf.confirm} onChange={v=>setRf(f=>({...f,confirm:v}))}/>
              {err && <div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}
              <button onClick={sendOtp} disabled={loading} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem",opacity:loading?0.7:1}}>{loading?"Đang gửi...":"📨 Gửi mã OTP"}</button>
            </>}
            {step===2 && <>
              {otpData && <OTPBox email={rf.email} otp={otpData.otp} demo={otpData.demo} onExpire={()=>{setStep(1);setErr("OTP hết hạn.");}}/>}
              <div><label style={S.lb}>Nhập mã OTP (6 số)</label><input value={otpInput} onChange={e=>setOtpInput(e.target.value.replace(/\D/,"").slice(0,6))} placeholder="• • • • • •" style={{...S.inp,textAlign:"center",fontSize:"1.5rem",letterSpacing:"0.3em",fontFamily:"monospace"}}/></div>
              {err && <div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}
              <button onClick={verifyOtp} disabled={loading} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem",opacity:loading?0.7:1}}>{loading?"Đang xác nhận...":"✓ Tạo tài khoản"}</button>
              <button onClick={()=>{setStep(1);setErr("");}} style={{background:"none",border:"none",color:"#555",fontSize:"0.79rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Quay lại</button>
            </>}
          </div>
        )}

        {tab==="forgot" && (
          <div style={{display:"grid",gap:"0.85rem"}}>
            <button onClick={()=>sw("login")} style={{background:"none",border:"none",color:"#555",fontSize:"0.79rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0}}>← Quay lại đăng nhập</button>
            <h3 style={{margin:0,fontFamily:"'Playfair Display',serif",color:"#fff"}}>Quên mật khẩu</h3>
            {fStep===1 && <><Field lb="Email tài khoản" type="email" val={ff.email} onChange={v=>setFf({email:v})}/>{err&&<div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}<button onClick={sendForgot} disabled={loading} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem",opacity:loading?0.7:1}}>{loading?"Đang gửi...":"Gửi OTP"}</button></>}
            {fStep===2 && <>{fOtpData&&<OTPBox email={ff.email} otp={fOtpData.otp} demo={fOtpData.demo} onExpire={()=>{setFStep(1);setErr("OTP hết hạn.");}}/>}<div><label style={S.lb}>Nhập OTP</label><input value={fInput} onChange={e=>setFInput(e.target.value.replace(/\D/,"").slice(0,6))} placeholder="• • • • • •" style={{...S.inp,textAlign:"center",fontSize:"1.5rem",letterSpacing:"0.3em",fontFamily:"monospace"}}/></div>{err&&<div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}<button onClick={()=>{if(fInput.length===6){setFStep(3);setErr("");}else setErr("Nhập đủ 6 số.");}} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem"}}>Xác nhận OTP</button></>}
            {fStep===3 && <><Field lb="Mật khẩu mới" type="password" val={newPw.pw} onChange={v=>setNewPw(p=>({...p,pw:v}))}/><Field lb="Xác nhận" type="password" val={newPw.confirm} onChange={v=>setNewPw(p=>({...p,confirm:v}))}/>{err&&<div style={{color:"#ff7777",fontSize:"0.8rem"}}>⚠ {err}</div>}<button onClick={resetPw} disabled={loading} style={{...S.btn("linear-gradient(135deg,#00C896,#00B4D8)"),padding:"0.75rem",opacity:loading?0.7:1}}>🔑 Đặt lại mật khẩu</button></>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PROFILE MODAL ─────────────────────────────────────────────────────────────
function ProfileModal({ user, currentUser, token, onUpdate, onClose, showToast }) {
  const isMe = user.id === currentUser.id;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name:user.name||"",bio:user.bio||""});
  const fileRef = useRef();

  const save = async () => {
    const res = await api.put(`/api/auth/profile`, form, token);
    if (res.id || res.name) { onUpdate(res); setEditing(false); showToast("Đã cập nhật hồ sơ!"); }
  };

  const uploadAvatar = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = async ev => {
      const res = await api.put("/api/auth/profile", {avatar:ev.target.result}, token);
      if (res.id || res.name) { onUpdate(res); showToast("Đã cập nhật ảnh!"); }
    };
    r.readAsDataURL(file);
  };

  return (
    <Modal title="Hồ sơ cá nhân" onClose={onClose} maxW={420}>
      <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
        <div style={{position:"relative",display:"inline-block"}}>
          <Av name={user.name} id={user.id} size={80} avatar={user.avatar}/>
          {isMe && <button onClick={()=>fileRef.current.click()} style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:"#FF6B35",border:"2px solid #060610",cursor:"pointer",fontSize:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center"}}>📷</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}}/>
        {editing ? (
          <div style={{marginTop:"0.75rem",display:"grid",gap:"0.6rem"}}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{...S.inp,textAlign:"center",fontWeight:700}}/>
            <textarea value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Giới thiệu bản thân..." rows={3} style={{...S.inp,resize:"none"}}/>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button onClick={()=>setEditing(false)} style={{...S.btn("rgba(255,255,255,0.07)","#888"),flex:1}}>Hủy</button>
              <button onClick={save} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),flex:2}}>Lưu</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{fontWeight:700,fontSize:"1.1rem",marginTop:"0.75rem",color:"#fff"}}>{user.name}</div>
            <div style={{fontSize:"0.8rem",color:"#666",marginTop:"0.2rem"}}>{user.email}</div>
            {user.bio && <p style={{fontSize:"0.82rem",color:"#888",margin:"0.6rem 0 0",lineHeight:1.6}}>{user.bio}</p>}
            {isMe && <button onClick={()=>setEditing(true)} style={{...S.btn("rgba(255,255,255,0.08)","#aaa"),marginTop:"0.75rem"}}>✏️ Chỉnh sửa hồ sơ</button>}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── EVENT FORM ────────────────────────────────────────────────────────────────
function EventForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || {title:"",datetime:"",location:"",description:"",category:"Khác",maxAttendees:"",image:null});
  const s = (k,v) => setF(p=>({...p,[k]:v}));
  const fileRef = useRef();

  return (
    <Modal title={initial?"Chỉnh sửa sự kiện":"Tạo sự kiện mới"} onClose={onClose} maxW={520}>
      <div style={{display:"grid",gap:"0.85rem"}}>
        <div onClick={()=>fileRef.current.click()} style={{height:120,borderRadius:"0.65rem",border:"2px dashed rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(255,107,53,0.4)"} onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}>
          {f.image ? <img src={f.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <div style={{textAlign:"center",color:"#555"}}><div style={{fontSize:"1.8rem"}}>🖼</div><div style={{fontSize:"0.78rem",marginTop:"0.3rem"}}>Upload ảnh sự kiện</div></div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>s("image",ev.target.result);r.readAsDataURL(file);}} style={{display:"none"}}/>
        <Field lb="Tên sự kiện" val={f.title} onChange={v=>s("title",v)}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
          <div><label style={S.lb}>Thời điểm</label><input type="datetime-local" value={f.datetime} onChange={e=>s("datetime",e.target.value)} style={{...S.inp,colorScheme:"dark"}}/></div>
          <div><label style={S.lb}>Giới hạn</label><input type="number" min="1" value={f.maxAttendees} onChange={e=>s("maxAttendees",e.target.value)} placeholder="Không giới hạn" style={S.inp}/></div>
        </div>
        <Field lb="Địa điểm" val={f.location} onChange={v=>s("location",v)}/>
        <div>
          <label style={S.lb}>Danh mục</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
            {CATEGORIES.map(c => <button key={c} onClick={()=>s("category",c)} style={{...S.btn(f.category===c?"linear-gradient(135deg,#FF6B35,#FF3D8B)":"rgba(255,255,255,0.06)",f.category===c?"#fff":"#888","0.35rem 0.75rem"),fontSize:"0.78rem",border:f.category===c?"none":"1px solid rgba(255,255,255,0.1)"}}>{CAT_ICONS[c]} {c}</button>)}
          </div>
        </div>
        <div><label style={S.lb}>Mô tả</label><textarea rows={3} value={f.description} onChange={e=>s("description",e.target.value)} style={{...S.inp,resize:"vertical"}}/></div>
        <div style={{display:"flex",gap:"0.6rem"}}>
          <button onClick={onClose} style={{...S.btn("rgba(255,255,255,0.07)","#888"),border:"1px solid rgba(255,255,255,0.1)"}}>Hủy</button>
          <button onClick={()=>{if(f.title&&f.datetime){onSave(f);onClose();}}} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),flex:1,padding:"0.65rem"}}>{initial?"Lưu thay đổi":"Tạo sự kiện"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── QR CHECK-IN ───────────────────────────────────────────────────────────────
function QRModal({ event, token, currentUser, onUpdate, showToast, onClose }) {
  const hash = s => { let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))&0xFFFFFFFF; return h; };
  const qrData = `EVENTFLOW|${event.id}|${event.title}|${currentUser.id}`;
  const seed = hash(qrData);
  const grid = Array.from({length:21},(_,r) => Array.from({length:21},(_,c) => {
    if((r<3&&c<3)||(r<3&&c>17)||(r>17&&c<3)) { if(r===0||r===6||c===0||c===6) return 1; if(r>=2&&r<=4&&c>=2&&c<=4) return 1; return 0; }
    if((r<7&&c<7)||(r<7&&c>13)||(r>13&&c<7)) { if(r===0||r===6||c===0||c===6) return 1; if(r>=2&&r<=4&&c>=2&&c<=4) return 1; return 0; }
    return (hash(qrData+r*100+c))%2;
  }));
  const isCheckedIn = event.checkedIn?.includes(currentUser.id);

  const checkIn = async () => {
    if (!event.members?.includes(currentUser.id) && event.ownerId!==currentUser.id) return showToast("Bạn chưa là thành viên!","err");
    if (isCheckedIn) return showToast("Đã check-in rồi!","err");
    const res = await api.post(`/api/events/${event.id}/checkin`, {}, token);
    if (res.id) { onUpdate(res); showToast("✅ Check-in thành công!"); onClose(); }
    else showToast(res.message||"Lỗi","err");
  };

  return (
    <Modal title="📲 QR Check-in" onClose={onClose} maxW={360}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.82rem",color:"#888",marginBottom:"1rem"}}>{event.title}</div>
        <div style={{display:"inline-block",background:"#fff",padding:"1rem",borderRadius:"0.75rem",marginBottom:"1rem"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(21,10px)",gap:1}}>
            {grid.flat().map((cell,i) => <div key={i} style={{width:10,height:10,background:cell?"#000":"#fff",borderRadius:cell?1:0}}/>)}
          </div>
        </div>
        <div style={{fontSize:"0.7rem",color:"#555",fontFamily:"monospace",marginBottom:"1.25rem",wordBreak:"break-all",padding:"0 1rem"}}>{qrData}</div>
        {isCheckedIn
          ? <span style={{...S.tag("#00C89622","#00C896"),padding:"0.5rem 1.5rem",fontSize:"0.85rem"}}>✅ Đã check-in</span>
          : <button onClick={checkIn} style={{...S.btn("linear-gradient(135deg,#00C896,#00B4D8)"),padding:"0.75rem 2rem",fontSize:"0.9rem"}}>📲 Check-in ngay</button>
        }
        {event.checkedIn?.length>0 && <div style={{marginTop:"1rem",fontSize:"0.78rem",color:"#555"}}>{event.checkedIn.length} người đã check-in</div>}
      </div>
    </Modal>
  );
}

// ── EMAIL MODAL ───────────────────────────────────────────────────────────────
function EmailModal({ event, users, onClose, showToast }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [subject, setSubject] = useState(`[EventFlow] Thông báo: ${event.title}`);
  const [body, setBody] = useState(`Xin chào,\n\nBạn được thông báo về sự kiện:\n📅 ${event.title}\n🕐 ${fmtDate(event.datetime)}\n📍 ${event.location}\n\n${event.description||""}\n\nTrân trọng,\nBan tổ chức EventFlow`);
  const members = (event.members||[]).map(id=>users.find(u=>u.id===id)).filter(Boolean);

  const send = () => {
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); showToast(`Đã gửi email tới ${members.length} thành viên! 📧`); }, 2000);
  };

  return (
    <Modal title="📧 Gửi email thông báo" onClose={onClose} maxW={520}>
      {sent ? (
        <div style={{textAlign:"center",padding:"2rem 0"}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>📧</div>
          <div style={{fontSize:"1rem",fontWeight:700,color:"#00C896",marginBottom:"0.5rem"}}>Email đã được gửi!</div>
          <div style={{fontSize:"0.82rem",color:"#666",marginBottom:"1.5rem"}}>Đã gửi tới {members.length} thành viên</div>
          {members.map(u => <div key={u.id} style={{display:"flex",alignItems:"center",gap:"0.6rem",background:"rgba(0,200,150,0.05)",border:"1px solid rgba(0,200,150,0.1)",borderRadius:"0.5rem",padding:"0.5rem 0.75rem",marginBottom:"0.4rem"}}><Av name={u.name} id={u.id} size={24}/><span style={{fontSize:"0.82rem",color:"#aaa"}}>{u.email}</span><span style={{marginLeft:"auto",fontSize:"0.7rem",color:"#00C896"}}>✓</span></div>)}
          <button onClick={onClose} style={{...S.btn("rgba(255,255,255,0.07)","#aaa"),marginTop:"1rem"}}>Đóng</button>
        </div>
      ) : (
        <div style={{display:"grid",gap:"0.9rem"}}>
          <div style={{background:"rgba(255,255,255,0.03)",borderRadius:"0.6rem",padding:"0.75rem"}}>
            <div style={{fontSize:"0.7rem",color:"#555",marginBottom:"0.5rem",textTransform:"uppercase",letterSpacing:"0.06em"}}>Gửi tới ({members.length} người)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>{members.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:"0.35rem",background:"rgba(255,255,255,0.05)",borderRadius:"99px",padding:"0.2rem 0.6rem 0.2rem 0.2rem",fontSize:"0.75rem",color:"#ccc"}}><Av name={u.name} id={u.id} size={20}/>{u.name}</div>)}</div>
          </div>
          <div><label style={S.lb}>Tiêu đề</label><input value={subject} onChange={e=>setSubject(e.target.value)} style={S.inp}/></div>
          <div><label style={S.lb}>Nội dung</label><textarea rows={7} value={body} onChange={e=>setBody(e.target.value)} style={{...S.inp,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:"0.6rem"}}>
            <button onClick={onClose} style={{...S.btn("rgba(255,255,255,0.07)","#888"),border:"1px solid rgba(255,255,255,0.1)"}}>Hủy</button>
            <button onClick={send} disabled={sending} style={{...S.btn("linear-gradient(135deg,#7C4DFF,#FF3D8B)"),flex:1,padding:"0.7rem",opacity:sending?0.7:1}}>{sending?"⏳ Đang gửi...":"📧 Gửi email"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── INVITE MODAL ──────────────────────────────────────────────────────────────
function InviteModal({ event, token, users, currentUser, onUpdate, showToast, onClose }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const eligible = users.filter(u =>
    u.id!==currentUser.id &&
    !event.members?.includes(u.id) &&
    !event.invites?.find(i=>i.toUserId===u.id&&i.status==="pending") &&
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const sendInv = async uid => {
    setLoading(true);
    const res = await api.post(`/api/events/${event.id}/invite`, {toUserId:uid}, token);
    setLoading(false);
    if (res.id) { onUpdate(res); showToast(`Đã mời ${users.find(u=>u.id===uid)?.name}!`); }
    else showToast(res.message||"Lỗi","err");
  };

  return (
    <Modal title="✉ Gửi lời mời tham gia" onClose={onClose}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm theo tên hoặc email..." style={{...S.inp,marginBottom:"1rem"}} autoFocus/>
      {eligible.length===0 ? <p style={{color:"#444",textAlign:"center",padding:"1rem 0"}}>Không tìm thấy người dùng.</p>
        : eligible.map(u => (
          <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.65rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.65rem"}}>
              <Av name={u.name} id={u.id} avatar={u.avatar}/>
              <div><div style={{fontSize:"0.88rem",fontWeight:600,color:"#ddd"}}>{u.name}</div><div style={{fontSize:"0.75rem",color:"#555"}}>{u.email}</div></div>
            </div>
            <button onClick={()=>sendInv(u.id)} disabled={loading} style={S.btn("#7C4DFF33","#7C4DFF")}>✉ Mời</button>
          </div>
        ))
      }
    </Modal>
  );
}

// ── EVENT DETAIL ──────────────────────────────────────────────────────────────
function Detail({ event, token, users, currentUser, onUpdate, onDelete, showToast, onClose }) {
  const [tab, setTab] = useState("info");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const ev = event;
  const isOwner = currentUser.id === ev.ownerId;
  const isMember = ev.members?.includes(currentUser.id);
  const myReq = ev.requests?.find(r=>r.fromUserId===currentUser.id);
  const myInv = ev.invites?.find(i=>i.toUserId===currentUser.id&&i.status==="pending");
  const pendReqs = ev.requests?.filter(r=>r.status==="pending")||[];
  const full = ev.maxAttendees && ev.members?.length >= Number(ev.maxAttendees);
  const c = COLORS[(ev.id||0)%COLORS.length];
  const pct = ev.maxAttendees ? Math.min(100,Math.round((ev.members?.length||0)/Number(ev.maxAttendees)*100)) : null;

  const act = async (path, body) => { setLoading(true); const res = await api.post(path,body,token); setLoading(false); if(res.id) onUpdate(res); return res; };
  const sendReq = async () => { const r = await act(`/api/events/${ev.id}/request`,{}); if(r.id) showToast("Đã gửi yêu cầu!"); else showToast(r.message,"err"); };
  const acceptInv = async () => { const r = await act(`/api/events/${ev.id}/invite/respond`,{action:"accept"}); if(r.id){showToast("Đã tham gia! 🎉");onClose();} };
  const declineInv = async () => { const r = await act(`/api/events/${ev.id}/invite/respond`,{action:"decline"}); if(r.id){showToast("Đã từ chối.");onClose();} };
  const acceptReq = async uid => { const r = await act(`/api/events/${ev.id}/request/respond`,{fromUserId:uid,action:"accept"}); if(r.id) showToast(`Đã chấp nhận!`); };
  const sendComment = async () => { if(!comment.trim()) return; const r = await act(`/api/events/${ev.id}/comment`,{text:comment,ts:Date.now()}); if(r.id) setComment(""); };
  const handleDelete = async () => { if(!window.confirm("Xóa sự kiện này?")) return; await api.del(`/api/events/${ev.id}`,token); onDelete(ev.id); onClose(); showToast("Đã xóa sự kiện."); };
  const handleEdit = async f => { const r = await api.put(`/api/events/${ev.id}`,f,token); if(r.id){onUpdate(r);showToast("Đã cập nhật!");} };

  return (
    <>
    <Modal title="" onClose={onClose} maxW={580}>
      {ev.image && <div style={{margin:"-1.25rem -1.25rem 1.25rem",height:180,overflow:"hidden",borderRadius:"1rem 1rem 0 0"}}><img src={ev.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.4rem",flexWrap:"wrap"}}>
            <span style={S.tag(`${c}22`,c)}>{CAT_ICONS[ev.category]} {ev.category}</span>
            {full && <span style={S.tag("#FF3D8B22","#FF3D8B")}>🔒 Đầy</span>}
            {ev.checkedIn?.includes(currentUser.id) && <span style={S.tag("#00C89622","#00C896")}>✅ Đã check-in</span>}
          </div>
          <h2 style={{margin:0,fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",color:"#fff"}}>{ev.title}</h2>
        </div>
        {isOwner && (
          <div style={{display:"flex",gap:"0.4rem",flexShrink:0}}>
            <button onClick={()=>setShowEdit(true)} style={S.btn("rgba(255,255,255,0.07)","#aaa","0.4rem 0.6rem")}>✏️</button>
            <button onClick={handleDelete} style={S.btn("rgba(255,60,60,0.1)","#ff6b6b","0.4rem 0.6rem")}>🗑️</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"0.4rem",marginBottom:"1rem",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:"0.75rem",flexWrap:"wrap"}}>
        {[["info","📋 Info"],["members","👥 Thành viên"],["comments","💬 Bình luận"]].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} style={{...S.btn(tab===k?"rgba(255,107,53,0.15)":"transparent",tab===k?"#FF6B35":"#666","0.35rem 0.75rem"),fontSize:"0.78rem",border:tab===k?"1px solid rgba(255,107,53,0.3)":"none"}}>{l}</button>
        ))}
      </div>

      {/* INFO */}
      {tab==="info" && <>
        <div style={{display:"grid",gap:"0.5rem",marginBottom:"1rem"}}>
          {[["📅",fmtDate(ev.datetime)],["📍",ev.location||"Chưa có"],["👤",`Tổ chức: ${ev.ownerName}`]].map(([ic,v]) => (
            <div key={v} style={{display:"flex",gap:"0.6rem",fontSize:"0.83rem",color:"#888"}}><span>{ic}</span><span>{v}</span></div>
          ))}
          {pct!==null && <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",color:"#666",marginBottom:"0.35rem"}}><span>Số lượng tham dự</span><span style={{color:pct>=100?"#FF3D8B":"#aaa"}}>{ev.members?.length}/{ev.maxAttendees}</span></div>
            <div style={{height:5,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#FF3D8B":c}}/></div>
          </div>}
          {ev.description && <p style={{margin:"0.25rem 0 0",fontSize:"0.82rem",color:"#666",lineHeight:1.65,background:"rgba(255,255,255,0.03)",padding:"0.7rem",borderRadius:"0.5rem"}}>{ev.description}</p>}
        </div>

        {isOwner && pendReqs.length>0 && (
          <div style={{marginBottom:"1rem",background:"rgba(255,180,0,0.05)",border:"1px solid rgba(255,180,0,0.15)",borderRadius:"0.75rem",padding:"0.85rem"}}>
            <div style={{fontSize:"0.7rem",color:"#FFB400",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"0.6rem"}}>⏳ Yêu cầu tham gia ({pendReqs.length})</div>
            {pendReqs.map(r => (
              <div key={r.fromUserId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.4rem 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.55rem"}}><Av name={r.fromName||"?"} id={r.fromUserId} size={28}/><span style={{fontSize:"0.84rem",color:"#ddd"}}>{r.fromName}</span></div>
                <button onClick={()=>acceptReq(r.fromUserId)} style={S.btn("#00C89622","#00C896","0.35rem 0.75rem")}>✓ Chấp nhận</button>
              </div>
            ))}
          </div>
        )}

        {isOwner && ev.invites?.filter(i=>i.status==="pending").length>0 && (
          <div style={{marginBottom:"1rem"}}>
            <div style={{fontSize:"0.68rem",color:"#7C4DFF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"0.5rem"}}>Lời mời đang chờ ({ev.invites.filter(i=>i.status==="pending").length})</div>
            {ev.invites.filter(i=>i.status==="pending").map(i => {
              const u = users.find(u=>u.id===i.toUserId);
              return u ? <div key={i.toUserId} style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.35rem 0",fontSize:"0.82rem",color:"#888"}}><Av name={u.name} id={u.id} size={24} avatar={u.avatar}/>{u.name} <span style={S.tag("#7C4DFF22","#7C4DFF")}>Chờ</span></div> : null;
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",paddingTop:"0.75rem",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {(isMember||isOwner) && <button onClick={()=>setShowQR(true)} style={S.btn("#00C89622","#00C896")}>📲 QR Check-in</button>}
          {isOwner && <button onClick={()=>setShowInvite(true)} style={S.btn("#7C4DFF33","#7C4DFF")}>✉ Mời</button>}
          {isOwner && <button onClick={()=>setShowEmail(true)} style={S.btn("#FF3D8B22","#FF3D8B")}>📧 Email</button>}
          {!isOwner&&!isMember&&!myReq&&!myInv&&!full && <button onClick={sendReq} disabled={loading} style={S.btn("#FF6B3522","#FF6B35")}>📨 Xin tham gia</button>}
          {!isOwner&&full&&!isMember&&!myInv && <span style={{...S.tag("#FF3D8B22","#FF3D8B"),padding:"0.4rem 0.8rem"}}>🔒 Đã đầy</span>}
          {!isOwner&&myReq?.status==="pending" && <span style={{...S.tag("#FFB40022","#FFB400"),padding:"0.4rem 0.8rem"}}>⏳ Chờ duyệt</span>}
          {!isOwner&&myReq?.status==="accepted" && <span style={{...S.tag("#00C89622","#00C896"),padding:"0.4rem 0.8rem"}}>✓ Đã tham gia</span>}
          {!isOwner&&myInv && <>
            <span style={{fontSize:"0.82rem",color:"#aaa",alignSelf:"center"}}>Bạn được mời!</span>
            <button onClick={acceptInv} disabled={loading} style={S.btn("#00C89633","#00C896")}>✓ Chấp nhận</button>
            <button onClick={declineInv} disabled={loading} style={S.btn("#FF3D8B22","#FF3D8B")}>✗ Từ chối</button>
          </>}
          {isMember&&!isOwner&&!myInv && <span style={{...S.tag("#00C89622","#00C896"),padding:"0.4rem 0.8rem"}}>✓ Thành viên</span>}
        </div>
      </>}

      {/* MEMBERS */}
      {tab==="members" && (
        <div style={{display:"grid",gap:"0.5rem"}}>
          {(ev.members||[]).map(mid => {
            const u = users.find(u=>u.id===mid);
            const nm = u?.name||"Người dùng";
            return (
              <div key={mid} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.5rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <Av name={nm} id={mid} size={36} avatar={u?.avatar}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.88rem",fontWeight:600,color:"#ddd"}}>{nm} {mid===ev.ownerId&&<span style={S.tag("#FF6B3522","#FF6B35")}>Chủ</span>}</div>
                  <div style={{fontSize:"0.73rem",color:"#555"}}>{ev.checkedIn?.includes(mid)?"✅ Đã check-in":"Chưa check-in"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMMENTS */}
      {tab==="comments" && (
        <div>
          <div style={{display:"grid",gap:"0.75rem",marginBottom:"1rem",maxHeight:280,overflowY:"auto"}}>
            {(ev.comments||[]).length===0 && <p style={{color:"#444",textAlign:"center",padding:"1rem 0"}}>Chưa có bình luận.</p>}
            {(ev.comments||[]).map((cm,i) => {
              const u = users.find(u=>u.id===cm.userId);
              return (
                <div key={i} style={{display:"flex",gap:"0.6rem"}}>
                  <Av name={u?.name||"?"} id={cm.userId} size={30} avatar={u?.avatar}/>
                  <div style={{flex:1,background:"rgba(255,255,255,0.04)",borderRadius:"0 0.6rem 0.6rem 0.6rem",padding:"0.5rem 0.75rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.2rem"}}>
                      <span style={{fontSize:"0.78rem",fontWeight:600,color:"#ddd"}}>{u?.name||"?"}</span>
                      <span style={{fontSize:"0.68rem",color:"#444"}}>{fmtAgo(cm.ts)}</span>
                    </div>
                    <div style={{fontSize:"0.83rem",color:"#bbb",lineHeight:1.5}}>{cm.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {(isMember||isOwner)
            ? <div style={{display:"flex",gap:"0.5rem"}}>
                <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendComment()} placeholder="Viết bình luận..." style={{...S.inp,flex:1}}/>
                <button onClick={sendComment} disabled={loading} style={S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)")}>Gửi</button>
              </div>
            : <p style={{fontSize:"0.78rem",color:"#444",textAlign:"center"}}>Tham gia để bình luận.</p>
          }
        </div>
      )}
    </Modal>
    {showInvite && <InviteModal event={ev} token={token} users={users} currentUser={currentUser} onUpdate={r=>{onUpdate(r);}} showToast={showToast} onClose={()=>setShowInvite(false)}/>}
    {showQR && <QRModal event={ev} token={token} currentUser={currentUser} onUpdate={r=>{onUpdate(r);}} showToast={showToast} onClose={()=>setShowQR(false)}/>}
    {showEmail && <EmailModal event={ev} users={users} showToast={showToast} onClose={()=>setShowEmail(false)}/>}
    {showEdit && <EventForm initial={ev} onSave={handleEdit} onClose={()=>setShowEdit(false)}/>}
    </>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────────────────────
function ECard({ ev, users, currentUser, onClick }) {
  const isOwner = currentUser.id === ev.ownerId;
  const isMember = ev.members?.includes(currentUser.id) && !isOwner;
  const hasInv = ev.invites?.find(i=>i.toUserId===currentUser.id&&i.status==="pending");
  const pendReqs = ev.requests?.filter(r=>r.status==="pending").length||0;
  const full = ev.maxAttendees && ev.members?.length >= Number(ev.maxAttendees);
  const c = COLORS[(ev.id||0)%COLORS.length];
  const pct = ev.maxAttendees ? Math.min(100,Math.round((ev.members?.length||0)/Number(ev.maxAttendees)*100)) : null;

  return (
    <div onClick={onClick} style={{...S.card,cursor:"pointer",position:"relative",overflow:"hidden",padding:0,transition:"transform 0.18s,box-shadow 0.18s"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 10px 36px #0006,0 0 0 1px ${c}44`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"3px",background:c,zIndex:1}}/>
      {ev.image
        ? <div style={{height:120,overflow:"hidden"}}><img src={ev.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
        : <div style={{height:55,background:`linear-gradient(135deg,${c}22,${c}08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem"}}>{CAT_ICONS[ev.category]||"📅"}</div>
      }
      <div style={{padding:"0.9rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem",gap:"0.4rem"}}>
          <h3 style={{margin:0,fontSize:"0.9rem",fontWeight:700,color:"#eee",flex:1,lineHeight:1.3}}>{ev.title}</h3>
          <div style={{display:"flex",gap:"0.25rem",flexWrap:"wrap",justifyContent:"flex-end",flexShrink:0}}>
            {isOwner && <span style={S.tag("#FF6B3518","#FF6B35")}>Tôi</span>}
            {isMember && <span style={S.tag("#00C89618","#00C896")}>TV</span>}
            {hasInv && <span style={S.tag("#7C4DFF18","#7C4DFF")}>Mời</span>}
            {isOwner&&pendReqs>0 && <span style={S.tag("#FFB40018","#FFB400")}>{pendReqs}⬆</span>}
            {full && <span style={S.tag("#FF3D8B18","#FF3D8B")}>Đầy</span>}
          </div>
        </div>
        <div style={{display:"grid",gap:"0.2rem",marginBottom:"0.6rem"}}>
          <div style={{fontSize:"0.75rem",color:"#555"}}>📅 {fmtDate(ev.datetime)}</div>
          <div style={{fontSize:"0.75rem",color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📍 {ev.location||"Chưa có địa điểm"}</div>
          <div style={{fontSize:"0.75rem",color:"#555"}}>👤 {ev.ownerName}</div>
        </div>
        {pct!==null && <div style={{marginBottom:"0.5rem"}}><div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#FF3D8B":c}}/></div></div>}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
            <div style={{display:"flex"}}>{(ev.members||[]).slice(0,4).map((mid,i)=>{const u=users.find(u=>u.id===mid);return u?<div key={mid} style={{width:20,height:20,borderRadius:"50%",background:`${aColor(u.id)}30`,border:`2px solid ${aColor(u.id)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:aColor(u.id),marginLeft:i===0?0:-6}}>{initials(u.name)}</div>:null;})}</div>
            <span style={{fontSize:"0.7rem",color:"#444"}}>{ev.members?.length||0}{ev.maxAttendees?`/${ev.maxAttendees}`:""}</span>
          </div>
          <span style={S.tag(`${c}18`,c)}>{CAT_ICONS[ev.category]} {ev.category}</span>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [me, setMe] = useState(() => { try { return JSON.parse(localStorage.getItem("ef_user")); } catch { return null; } });
  const [token, setToken] = useState(() => localStorage.getItem("ef_token"));
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // create | notif | profile
  const [detailEv, setDetailEv] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const showToast = useCallback((msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); }, []);

  // Load & poll data
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [evs, us] = await Promise.all([api.get("/api/events",token), api.get("/api/auth/users",token)]);
        if (Array.isArray(evs)) setEvents(evs);
        if (Array.isArray(us)) setUsers(us);
        if (evs.message==="Token không hợp lệ") { handleLogout(); }
      } catch {}
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [token]);

  // Sync me from users list
  useEffect(() => {
    if (me && users.length>0) {
      const updated = users.find(u=>u.id===me.id);
      if (updated) setMe(updated);
    }
  }, [users]);

  const handleLogin = (user, tk) => { setMe(user); setToken(tk); };
  const handleLogout = () => { setMe(null); setToken(null); localStorage.removeItem("ef_token"); localStorage.removeItem("ef_user"); setEvents([]); setUsers([]); };
  const handleCreate = async f => { const res = await api.post("/api/events",f,token); if(res.id){setEvents(es=>[...es,res]);showToast("Đã tạo sự kiện! 🎉");}else showToast(res.message||"Lỗi","err"); };
  const handleUpdate = updated => { setEvents(es=>es.map(e=>e.id===updated.id?updated:e)); if(detailEv?.id===updated.id) setDetailEv(updated); };
  const handleDelete = id => setEvents(es=>es.filter(e=>e.id!==id));
  const handleUpdateMe = updated => { setMe(updated); setUsers(us=>us.map(u=>u.id===updated.id?updated:u)); localStorage.setItem("ef_user",JSON.stringify(updated)); };

  if (!me) return <Auth onLogin={handleLogin}/>;

  const myInvCount = events.filter(e=>e.invites?.find(i=>i.toUserId===me.id&&i.status==="pending")).length;
  const shown = events.filter(e => {
    if (tab==="mine" && e.ownerId!==me.id) return false;
    if (tab==="joined" && (e.ownerId===me.id||!e.members?.includes(me.id))) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !(e.location||"").toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && e.category!==catFilter) return false;
    if (dateFilter && new Date(e.datetime).toISOString().slice(0,10)!==dateFilter) return false;
    return true;
  });

  return (
    <div style={{minHeight:"100vh",background:"#060610",fontFamily:"'Sora',sans-serif",color:"#fff"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Playfair+Display:wght@700;800&display=swap');*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:#333}input:focus,textarea:focus{border-color:rgba(255,107,53,0.4)!important}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}`}</style>

      {/* NAV */}
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.07)",padding:"0.85rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"rgba(6,6,16,0.96)",backdropFilter:"blur(16px)",zIndex:200,gap:"0.75rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.65rem",flexShrink:0}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#FF6B35,#FF3D8B)",borderRadius:"0.55rem",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.95rem"}}>📅</div>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:"1.1rem",fontWeight:800}}>EventFlow</span>
        </div>
        <div style={{flex:1,maxWidth:380,position:"relative"}}>
          <span style={{position:"absolute",left:"0.8rem",top:"50%",transform:"translateY(-50%)",color:"#444",pointerEvents:"none"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm sự kiện..." style={{...S.inp,paddingLeft:"2.2rem",background:"rgba(255,255,255,0.04)"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.55rem",flexShrink:0}}>
          <button onClick={()=>setModal("notif")} style={{...S.btn("rgba(255,255,255,0.05)","#aaa","0.5rem 0.7rem"),border:"1px solid rgba(255,255,255,0.09)",position:"relative"}}>
            🔔{myInvCount>0&&<span style={{position:"absolute",top:-5,right:-5,width:17,height:17,background:"#FF3D8B",borderRadius:"50%",fontSize:"0.6rem",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff"}}>{myInvCount}</span>}
          </button>
          <button onClick={()=>setModal("create")} style={S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)")}>+ Tạo</button>
          <div onClick={()=>setModal("profile")} style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"rgba(255,255,255,0.05)",borderRadius:"0.55rem",padding:"0.3rem 0.65rem 0.3rem 0.3rem",cursor:"pointer",border:"1px solid rgba(255,255,255,0.08)"}}>
            <Av name={me.name} id={me.id} size={26} avatar={me.avatar}/>
            <span style={{fontSize:"0.75rem",color:"#999",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{me.name}</span>
          </div>
          <button onClick={handleLogout} style={{...S.btn("rgba(255,255,255,0.05)","#555","0.5rem 0.6rem"),border:"1px solid rgba(255,255,255,0.08)",fontSize:"0.75rem"}}>⏏ Xuất</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem 1.25rem"}}>
        {/* Filters */}
        <div style={{display:"flex",gap:"0.45rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
          {[["all","🗓 Tất cả"],["mine","⭐ Của tôi"],["joined","✅ Tham gia"]].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{padding:"0.4rem 0.8rem",borderRadius:"0.5rem",border:tab===k?"none":"1px solid rgba(255,255,255,0.09)",background:tab===k?"linear-gradient(135deg,#FF6B35,#FF3D8B)":"#0E0E1C",color:tab===k?"#fff":"#555",cursor:"pointer",fontFamily:"inherit",fontSize:"0.78rem",fontWeight:tab===k?700:400}}>{l}</button>
          ))}
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...S.inp,width:"auto",padding:"0.38rem 0.7rem",fontSize:"0.78rem",background:"#0E0E1C",colorScheme:"dark"}}>
            <option value="">📂 Danh mục</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{...S.inp,width:"auto",padding:"0.38rem 0.7rem",fontSize:"0.78rem",background:"#0E0E1C",colorScheme:"dark"}}/>
          {(catFilter||dateFilter||search) && <button onClick={()=>{setCatFilter("");setDateFilter("");setSearch("");}} style={{...S.btn("rgba(255,80,80,0.1)","#ff7777","0.38rem 0.7rem"),fontSize:"0.75rem"}}>✕ Xóa</button>}
          <span style={{marginLeft:"auto",fontSize:"0.75rem",color:"#444"}}>{shown.length} sự kiện</span>
        </div>

        {/* Grid */}
        {events.length===0
          ? <div style={{textAlign:"center",padding:"5rem 0",color:"#333"}}>
              <div style={{fontSize:"3.5rem",marginBottom:"1rem"}}>📭</div>
              <div style={{fontSize:"1rem",marginBottom:"0.5rem",color:"#555"}}>Chưa có sự kiện nào</div>
              <button onClick={()=>setModal("create")} style={{...S.btn("linear-gradient(135deg,#FF6B35,#FF3D8B)"),padding:"0.75rem 1.5rem",marginTop:"0.5rem"}}>+ Tạo sự kiện đầu tiên</button>
            </div>
          : shown.length===0
          ? <div style={{textAlign:"center",padding:"4rem 0",color:"#333"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>🔍</div>
              <div style={{fontSize:"0.9rem"}}>Không tìm thấy kết quả</div>
              <button onClick={()=>{setCatFilter("");setDateFilter("");setSearch("");}} style={{...S.btn("rgba(255,255,255,0.07)","#888","0.5rem 1rem"),marginTop:"1rem",fontSize:"0.8rem"}}>Xóa bộ lọc</button>
            </div>
          : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"0.9rem"}}>
              {shown.map(e=><ECard key={e.id} ev={e} users={users} currentUser={me} onClick={()=>setDetailEv(e)}/>)}
            </div>
        }
      </div>

      {/* MODALS */}
      {modal==="notif" && (
        <Modal title={`🔔 Thông báo (${myInvCount})`} onClose={()=>setModal(null)}>
          {events.filter(e=>e.invites?.find(i=>i.toUserId===me.id&&i.status==="pending")).length===0
            ? <p style={{color:"#444",textAlign:"center",padding:"1.5rem 0"}}>Không có thông báo mới 🎉</p>
            : events.filter(e=>e.invites?.find(i=>i.toUserId===me.id&&i.status==="pending")).map(e=>(
              <div key={e.id} style={{padding:"0.85rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                {e.image && <img src={e.image} alt="" style={{width:"100%",height:70,objectFit:"cover",borderRadius:"0.5rem",marginBottom:"0.5rem"}}/>}
                <p style={{margin:"0 0 0.4rem",fontSize:"0.83rem",color:"#ccc"}}><strong style={{color:"#7C4DFF"}}>{e.ownerName}</strong> mời bạn tham gia <strong>{e.title}</strong></p>
                <div style={{fontSize:"0.75rem",color:"#555",marginBottom:"0.6rem"}}>📅 {fmtDate(e.datetime)} • 📍 {e.location}</div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <button onClick={async()=>{const r=await api.post(`/api/events/${e.id}/invite/respond`,{action:"accept"},token);if(r.id){handleUpdate(r);showToast("Đã chấp nhận! 🎉");}setModal(null);}} style={S.btn("#00C89633","#00C896")}>✓ Chấp nhận</button>
                  <button onClick={async()=>{const r=await api.post(`/api/events/${e.id}/invite/respond`,{action:"decline"},token);if(r.id){handleUpdate(r);showToast("Đã từ chối.");}setModal(null);}} style={S.btn("#FF3D8B22","#FF3D8B")}>✗ Từ chối</button>
                </div>
              </div>
            ))
          }
        </Modal>
      )}

      {modal==="create" && <EventForm onSave={handleCreate} onClose={()=>setModal(null)}/>}

      {modal==="profile" && (
        <ProfileModal user={me} currentUser={me} token={token} onUpdate={handleUpdateMe} onClose={()=>setModal(null)} showToast={showToast}/>
      )}

      {detailEv && (
        <Detail event={detailEv} token={token} users={users} currentUser={me} onUpdate={handleUpdate} onDelete={handleDelete} showToast={showToast} onClose={()=>setDetailEv(null)}/>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}