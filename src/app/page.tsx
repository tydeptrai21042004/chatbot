import Link from "next/link";

const FEATURES = [
  {
    eyebrow: "Trò chuyện riêng tư",
    title: "Một nơi để bắt đầu nói ra",
    text: "Chia sẻ theo nhịp của bạn. Bắt đầu nhanh với một không gian trò chuyện tập trung và dễ tiếp cận."
  },
  {
    eyebrow: "Hỗ trợ có định hướng",
    title: "Gợi ý ngắn, rõ và thực tế",
    text: "Phản hồi được trình bày rõ ràng, có định hướng và phù hợp với bối cảnh học đường."
  },
  {
    eyebrow: "Dành cho nhà trường",
    title: "Kết nối dữ liệu học tập an toàn",
    text: "Nhà trường có thể quản lý tài khoản và dữ liệu học tập, trong khi nội dung trò chuyện cá nhân vẫn được bảo vệ."
  }
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="brand" href="/" aria-label="Trang chủ An Tâm">
          <span className="brand-mark" aria-hidden>●</span>
          <span>An Tâm</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <a href="#about">Giới thiệu</a>
          <a href="#principles">Nguyên tắc</a>
          <Link className="nav-cta" href="/chat">Bắt đầu trò chuyện</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy reveal-up">
          <div className="eyebrow"><span /> Cố vấn tinh thần học đường</div>
          <h1>Một cuộc trò chuyện nhẹ nhàng có thể là điểm bắt đầu.</h1>
          <p>
            Một nền tảng hỗ trợ ban đầu dành cho học sinh, giúp các em nhìn rõ vấn đề,
            ổn định cảm xúc và lựa chọn bước tiếp theo phù hợp trong môi trường học đường.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/chat">Trò chuyện ngay <span aria-hidden>→</span></Link>
            <a className="button button-secondary" href="#about">Tìm hiểu thêm</a>
          </div>
          <div className="hero-trust" aria-label="Cam kết sản phẩm">
            <span>Quyền riêng tư rõ ràng</span>
            <span>Phản hồi có định hướng</span>
            <span>Ưu tiên an toàn</span>
          </div>
        </div>

        <div className="hero-visual reveal-scale" aria-hidden>
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="conversation-card card-main">
            <div className="conversation-head"><span className="avatar-dot">A</span><div><strong>An Tâm</strong><small>Đang đồng hành cùng bạn</small></div><span className="online-dot" /></div>
            <div className="message assistant">Hôm nay điều gì đang làm bạn thấy nặng lòng nhất?</div>
            <div className="message user">Em đang áp lực vì kết quả học tập và không biết bắt đầu từ đâu.</div>
            <div className="message assistant narrow">Mình cùng tách từng việc nhỏ nhé. Trước hết, điều nào khiến em lo nhất lúc này?</div>
            <div className="typing-line"><span/><span/><span/></div>
          </div>
          <div className="floating-card floating-one"><span>✓</span><div><strong>Không phán xét</strong><small>Phản hồi trung lập, tôn trọng</small></div></div>
          <div className="floating-card floating-two"><span>⌁</span><div><strong>Riêng tư</strong><small>Chat không chia sẻ với giáo viên</small></div></div>
        </div>
      </section>

      <section className="feature-section" id="about">
        <div className="section-heading">
          <div className="eyebrow"><span /> Trải nghiệm được thiết kế có chủ đích</div>
          <h2>Đơn giản, nhất quán và phù hợp với môi trường học đường.</h2>
          <p>Giao diện được tinh giản để học sinh dễ bắt đầu trò chuyện, còn giáo viên có một khu vực quản trị riêng để theo dõi tài khoản và dữ liệu học tập.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature, index) => (
            <article className="feature-card" key={feature.title} style={{ animationDelay: `${index * 90}ms` }}>
              <div className="feature-number">0{index + 1}</div>
              <div className="feature-eyebrow">{feature.eyebrow}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="principles-section" id="principles">
        <div>
          <div className="eyebrow light"><span /> Nguyên tắc vận hành</div>
          <h2>Vận hành với các nguyên tắc minh bạch.</h2>
        </div>
        <div className="principle-list">
          <div><strong>01</strong><p>Không thay thế chuyên gia sức khỏe tâm thần, tư vấn viên học đường hoặc dịch vụ khẩn cấp.</p></div>
          <div><strong>02</strong><p>Dữ liệu học tập chỉ được dùng để nhận diện xu hướng hỗ trợ, không dùng để gắn nhãn người học.</p></div>
          <div><strong>03</strong><p>Nội dung trò chuyện cá nhân không được hiển thị trong khu vực quản trị của giáo viên.</p></div>
        </div>
      </section>


      <section className="creator-section" aria-labelledby="creator-title">
        <div className="creator-copy">
          <div className="eyebrow"><span /> Đơn vị thực hiện</div>
          <h2 id="creator-title">Được phát triển từ nhu cầu thực tế của nhà trường.</h2>
          <p>Sản phẩm được xây dựng với định hướng hỗ trợ học sinh tiếp cận một kênh trò chuyện ban đầu rõ ràng, an toàn và dễ sử dụng.</p>
        </div>
        <div className="creator-card">
          <div className="creator-badge">Nhóm phát triển</div>
          <div className="creator-names">
            <strong>Nguyễn Thanh Thiện</strong>
            <strong>Nguyễn Tùng Dương</strong>
          </div>
          <div className="creator-meta">
            <span>Trường THCS Mỹ Phước</span>
            <span>Phường Bến Cát</span>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div><span>Bắt đầu khi bạn sẵn sàng</span><h2>Bạn không cần phải có sẵn câu trả lời.</h2></div>
        <Link className="button button-primary" href="/chat">Mở không gian trò chuyện <span aria-hidden>→</span></Link>
      </section>

      <footer className="landing-footer"><div className="brand"><span className="brand-mark" aria-hidden>●</span><span>An Tâm</span></div><p>Nền tảng hỗ trợ tinh thần học đường dành cho học sinh Việt Nam.</p></footer>

      <style>{`
        .landing-page{min-height:100vh;background:#f8fafc;color:#142033;overflow:hidden}.landing-nav{height:78px;max-width:1220px;margin:auto;padding:0 28px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:10}.brand{display:flex;align-items:center;gap:10px;font-weight:850;font-size:19px;letter-spacing:-.03em}.brand-mark{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;font-size:10px;color:#fff;background:linear-gradient(145deg,#235ee7,#7657df);box-shadow:0 8px 20px rgba(35,94,231,.22)}.landing-nav nav{display:flex;align-items:center;gap:28px;font-size:14px;font-weight:650;color:#617087}.landing-nav nav a{transition:color .2s ease}.landing-nav nav a:hover{color:#17315c}.landing-nav .nav-cta{color:#fff;background:#16243d;padding:11px 17px;border-radius:12px}.landing-hero{max-width:1220px;margin:auto;padding:82px 28px 108px;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:76px;min-height:700px}.eyebrow{display:flex;align-items:center;gap:9px;text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:850;color:#315bd0}.eyebrow span{width:20px;height:2px;background:currentColor}.hero-copy h1{font-size:clamp(48px,6vw,74px);line-height:1.02;letter-spacing:-.055em;max-width:720px;margin:24px 0 24px;font-weight:780}.hero-copy>p{font-size:18px;line-height:1.72;color:#5f6f86;max-width:630px;margin:0}.hero-actions{display:flex;gap:12px;margin-top:34px}.button{min-height:50px;padding:0 20px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:12px;font-size:14px;font-weight:800;transition:transform .2s ease,box-shadow .2s ease,background .2s ease}.button:hover{transform:translateY(-2px)}.button-primary{background:#235ee7;color:#fff;box-shadow:0 15px 30px rgba(35,94,231,.2)}.button-primary:hover{box-shadow:0 20px 38px rgba(35,94,231,.27)}.button-secondary{background:#fff;border:1px solid #dde4ee;color:#263a58}.hero-trust{display:flex;flex-wrap:wrap;gap:22px;margin-top:27px;color:#718097;font-size:12px;font-weight:700}.hero-trust span:before{content:'✓';color:#287c55;margin-right:7px}.hero-visual{height:520px;position:relative;display:grid;place-items:center}.ambient{position:absolute;border-radius:999px;filter:blur(2px);animation:float 7s ease-in-out infinite}.ambient-one{width:330px;height:330px;background:rgba(80,121,244,.15);top:20px;right:10px}.ambient-two{width:240px;height:240px;background:rgba(130,97,220,.12);bottom:28px;left:0;animation-delay:-3s}.conversation-card{position:relative;z-index:2;width:min(100%,440px);background:rgba(255,255,255,.94);border:1px solid rgba(26,48,85,.08);box-shadow:0 38px 90px rgba(25,44,82,.16);border-radius:26px;padding:22px;backdrop-filter:blur(18px);animation:float-card 6s ease-in-out infinite}.conversation-head{display:flex;align-items:center;gap:11px;padding-bottom:18px;border-bottom:1px solid #edf0f5}.conversation-head>div{display:grid;gap:2px}.conversation-head small{font-size:11px;color:#7d899a}.avatar-dot{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#235ee7;color:#fff;font-weight:850}.online-dot{width:8px;height:8px;border-radius:50%;background:#34aa6f;margin-left:auto;box-shadow:0 0 0 5px #e8f7ef}.message{max-width:83%;margin-top:17px;padding:12px 14px;border-radius:16px;font-size:13px;line-height:1.55}.message.assistant{background:#f1f5fb;color:#35465f;border-bottom-left-radius:6px}.message.user{background:#235ee7;color:#fff;margin-left:auto;border-bottom-right-radius:6px}.message.narrow{max-width:92%}.typing-line{display:flex;gap:4px;margin:17px 0 2px 6px}.typing-line span{width:5px;height:5px;border-radius:50%;background:#9aa8ba;animation:typing 1.2s infinite}.typing-line span:nth-child(2){animation-delay:.15s}.typing-line span:nth-child(3){animation-delay:.3s}.floating-card{position:absolute;z-index:3;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.92);border:1px solid rgba(26,48,85,.08);box-shadow:0 20px 45px rgba(25,44,82,.13);padding:12px 14px;border-radius:16px;animation:float 6s ease-in-out infinite}.floating-card>span{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:#ebf3ff;color:#235ee7;font-weight:900}.floating-card>div{display:grid;gap:2px}.floating-card strong{font-size:12px}.floating-card small{font-size:10px;color:#78869a}.floating-one{left:-18px;top:68px}.floating-two{right:-12px;bottom:52px;animation-delay:-2.5s}.feature-section{max-width:1220px;margin:auto;padding:100px 28px 120px}.section-heading{max-width:650px}.section-heading h2{font-size:44px;line-height:1.12;letter-spacing:-.045em;margin:20px 0 16px}.section-heading p{color:#6b788b;line-height:1.7}.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}.feature-card{min-height:290px;background:#fff;border:1px solid #e5e9ef;border-radius:22px;padding:26px;box-shadow:0 16px 40px rgba(22,42,76,.055);animation:reveal .7s both}.feature-number{font-size:12px;color:#9aa5b5;font-weight:800;margin-bottom:54px}.feature-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#315bd0;font-weight:850}.feature-card h3{font-size:22px;letter-spacing:-.025em;margin:12px 0 12px}.feature-card p{color:#6c798b;line-height:1.68;font-size:14px}.principles-section{max-width:1164px;margin:0 auto 110px;background:#15233c;color:#fff;border-radius:30px;padding:64px;display:grid;grid-template-columns:.8fr 1.2fr;gap:70px}.eyebrow.light{color:#98b5ff}.principles-section h2{font-size:42px;line-height:1.12;letter-spacing:-.04em;margin:20px 0 0}.principle-list{display:grid}.principle-list>div{display:grid;grid-template-columns:48px 1fr;gap:20px;padding:22px 0;border-bottom:1px solid rgba(255,255,255,.12)}.principle-list>div:last-child{border:0}.principle-list strong{color:#94b1ff}.principle-list p{margin:0;line-height:1.65;color:#c6d0df}.creator-section{max-width:1164px;margin:0 auto 100px;padding:58px 60px;border:1px solid #e1e7ef;border-radius:30px;background:linear-gradient(135deg,#ffffff 0%,#f4f7ff 100%);display:grid;grid-template-columns:1.05fr .95fr;gap:72px;align-items:center}.creator-copy h2{font-size:38px;line-height:1.16;letter-spacing:-.04em;margin:20px 0 14px}.creator-copy p{margin:0;color:#69788e;line-height:1.75}.creator-card{background:#15233c;color:#fff;border-radius:22px;padding:28px;box-shadow:0 22px 50px rgba(21,35,60,.16)}.creator-badge{display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(148,177,255,.13);color:#b8c9ff;font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.creator-names{display:grid;gap:8px;margin:24px 0 22px}.creator-names strong{font-size:22px;letter-spacing:-.025em}.creator-meta{display:flex;flex-wrap:wrap;gap:10px}.creator-meta span{padding:9px 11px;border:1px solid rgba(255,255,255,.13);border-radius:10px;color:#cbd5e3;font-size:12px}.final-cta{max-width:1164px;margin:0 auto 100px;padding:44px 52px;border:1px solid #dfe5ee;border-radius:26px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:30px}.final-cta span{font-size:12px;color:#738197;font-weight:750}.final-cta h2{font-size:30px;margin:8px 0 0;letter-spacing:-.035em}.landing-footer{max-width:1220px;margin:auto;padding:28px;border-top:1px solid #e2e7ee;display:flex;align-items:center;justify-content:space-between;color:#7a8798;font-size:12px}.landing-footer p{margin:0}.reveal-up{animation:reveal-up .8s cubic-bezier(.2,.8,.2,1) both}.reveal-scale{animation:reveal-scale .9s .12s cubic-bezier(.2,.8,.2,1) both}@keyframes reveal-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@keyframes reveal-scale{from{opacity:0;transform:scale(.96) translateY(20px)}to{opacity:1;transform:none}}@keyframes reveal{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes float-card{0%,100%{transform:translateY(0) rotate(-.4deg)}50%{transform:translateY(-8px) rotate(.4deg)}}@keyframes typing{0%,80%,100%{opacity:.35;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}@media(max-width:980px){.creator-section{grid-template-columns:1fr;gap:34px}.landing-hero{grid-template-columns:1fr;padding-top:55px}.hero-copy{max-width:760px}.hero-visual{height:500px}.feature-grid{grid-template-columns:1fr}.feature-card{min-height:auto}.principles-section{grid-template-columns:1fr}.final-cta{align-items:flex-start;flex-direction:column}}@media(max-width:680px){.creator-section{margin:0 12px 72px;padding:34px 24px}.creator-copy h2{font-size:32px}.creator-meta{flex-direction:column}.landing-nav{padding:0 18px}.landing-nav nav>a:not(.nav-cta){display:none}.landing-hero{padding:48px 18px 72px;gap:36px}.hero-copy h1{font-size:43px}.hero-copy>p{font-size:16px}.hero-actions{flex-direction:column;align-items:stretch}.hero-visual{height:410px}.conversation-card{padding:17px}.floating-card{display:none}.feature-section{padding:72px 18px}.section-heading h2,.principles-section h2{font-size:34px}.principles-section{margin:0 12px 72px;padding:34px 24px}.final-cta{margin:0 12px 70px;padding:30px 24px}.landing-footer{margin:0 18px;padding:24px 0;align-items:flex-start;gap:16px;flex-direction:column}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
      `}</style>
    </main>
  );
}
