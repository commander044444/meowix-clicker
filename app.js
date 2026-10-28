(() => {
  "use strict";
  const cfg = window.MEOWIX_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes("YOUR_PROJECT") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
  const client = configured && window.supabase
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const $ = (id) => document.getElementById(id);
  const ui = {
    authPanel: $("authPanel"), gameApp: $("gameApp"), authForm: $("authForm"),
    authMessage: $("authMessage"), email: $("emailInput"), password: $("passwordInput"),
    coins: $("coinBalance"), level: $("levelValue"), tapPower: $("tapPower"),
    passivePower: $("passivePower"), profitHour: $("profitHour"), energyFill: $("energyFill"),
    energyText: $("energyText"), tapCost: $("tapCost"), passiveCost: $("passiveCost"),
    toast: $("toast"), cat: $("catButton"), profileEmail: $("profileEmail"),
    playerLabel: $("playerLabel"), leaderboard: $("leaderboard")
  };
  let session = null, state = null, lang = "en", busy = false, toastTimer = null;
  let demoState = { coins: 0, energy: 100, level: 1, tap_power: 1, passive_per_hour: 0, tap_cost: 25, passive_cost: 100, daily_claimed: false };
  const translations = {
    en: {
      welcomeTo:"WELCOME TO MEOWIX",joinTheClub:"Join the cat club",authDesc:"Sign in to save your coins and progress.",email:"Email",password:"Password",signIn:"Sign in",createAccount:"Create account",authNote:"Your password is handled by Supabase Auth, not stored by this app.",
      welcomeBack:"WELCOME BACK",hello:"Hey, Cat Lover",level:"LEVEL",yourCoins:"YOUR MEOW COINS",profitHour:"Profit per hour",tapCat:"TAP THE CAT TO EARN COINS",perTap:"PER TAP",passiveHour:"PASSIVE / HOUR",growYourCat:"GROW YOUR CAT",mineUpgrades:"Mine & upgrades",strongerPaws:"Stronger Paws",moreTap:"Earn more coins per tap",catNap:"Cat Nap",earnRest:"Earn coins while you rest",upgrade:"UPGRADE",upgradeNote:"Upgrade prices rise as your cat gets stronger.",littleGoals:"LITTLE GOALS",dailyTasks:"Daily tasks",dailyWelcome:"Daily hello",dailyDesc:"Claim your daily welcome reward.",claim:"CLAIM",tapExplorer:"Tap explorer",tapExplorerDesc:"Keep tapping to grow your cat's stash.",inProgress:"Progress is saved as you play",tasksNote:"More missions can be added from the database as the game grows.",betterTogether:"BETTER TOGETHER",inviteFriends:"Invite friends",inviteTitle:"Bring a friend, grow together",inviteDesc:"Your personal invite link will appear here when referral rewards are enabled.",copyInvite:"Copy invite link",topCats:"TOP CATS",leaderboard:"Leaderboard",rankingNote:"Sign in and play to join the leaderboard.",yourCorner:"YOUR CORNER",profile:"Profile",memberOf:"Meowix cat club",signOut:"Sign out",profileNote:"Meow Coins are virtual game points and have no cash value.",home:"Home",mine:"Mine",tasks:"Tasks",friends:"Friends",ranking:"Ranking"
    },
    fa: {
      welcomeTo:"به MEOWIX خوش اومدی",joinTheClub:"به جمع گربه‌ها بپیوند",authDesc:"وارد شو تا سکه‌ها و پیشرفتت ذخیره بشه.",email:"ایمیل",password:"رمز عبور",signIn:"ورود",createAccount:"ساخت حساب",authNote:"رمزت توسط Supabase Auth مدیریت می‌شه و این برنامه ذخیره‌اش نمی‌کنه.",
      welcomeBack:"خوش برگشتی",hello:"سلام گربه‌دوست",level:"سطح",yourCoins:"سکه‌های میو",profitHour:"درآمد ساعتی",tapCat:"برای گرفتن سکه روی گربه بزن",perTap:"درآمد هر لمس",passiveHour:"درآمد غیرفعال / ساعت",growYourCat:"گربه‌ات رو قوی کن",mineUpgrades:"معدن و ارتقاها",strongerPaws:"پنجه‌های قوی‌تر",moreTap:"سکه بیشتر با هر لمس",catNap:"چرت گربه‌ای",earnRest:"حتی موقع استراحت سکه بگیر",upgrade:"ارتقا",upgradeNote:"با قوی‌تر شدن گربه، قیمت ارتقاها افزایش پیدا می‌کنه.",littleGoals:"هدف‌های کوچیک",dailyTasks:"ماموریت‌های روزانه",dailyWelcome:"سلام روزانه",dailyDesc:"جایزهٔ روزانه‌ات رو بگیر.",claim:"دریافت",tapExplorer:"کاوشگر لمس",tapExplorerDesc:"لمس کن و سکه‌هات رو بیشتر کن.",inProgress:"پیشرفتت حین بازی ذخیره می‌شه",tasksNote:"بعداً می‌تونیم مأموریت‌های بیشتری از دیتابیس اضافه کنیم.",betterTogether:"باهم بهتره",inviteFriends:"دعوت از دوستان",inviteTitle:"دوستت رو بیار و باهم رشد کنین",inviteDesc:"وقتی پاداش دعوت فعال بشه، لینک اختصاصی اینجا نمایش داده می‌شه.",copyInvite:"کپی لینک دعوت",topCats:"گربه‌های برتر",leaderboard:"جدول رتبه‌بندی",rankingNote:"برای حضور در جدول، وارد شو و بازی کن.",yourCorner:"گوشهٔ خودت",profile:"پروفایل",memberOf:"عضو باشگاه گربه‌های Meowix",signOut:"خروج از حساب",profileNote:"سکه‌های میو امتیاز مجازی بازی هستن و ارزش نقدی ندارن.",home:"خانه",mine:"معدن",tasks:"ماموریت",friends:"دوستان",ranking:"رتبه‌بندی"
    }
  };

  function t(key) { return translations[lang][key] || key; }
  function say(message, target = ui.toast) {
    target.textContent = message;
    if (target === ui.toast) { clearTimeout(toastTimer); toastTimer = setTimeout(() => target.textContent = "", 2600); }
  }
  function showAuth(show, message = "") {
    ui.authPanel.classList.toggle("hidden", !show);
    ui.gameApp.classList.toggle("hidden", show);
    if (message) say(message, ui.authMessage);
  }
  function fmt(n) { return Math.max(0, Number(n || 0)).toLocaleString(lang === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 0 }); }
  function render() {
    const s = state || demoState;
    ui.coins.textContent = fmt(s.coins);
    ui.level.textContent = fmt(s.level || 1);
    ui.tapPower.textContent = fmt(s.tap_power || 1);
    ui.passivePower.textContent = fmt(s.passive_per_hour || 0);
    ui.profitHour.textContent = fmt(s.passive_per_hour || 0);
    ui.energyText.textContent = `${fmt(s.energy)} / 100`;
    ui.energyFill.style.width = `${Math.max(0, Math.min(100, Number(s.energy || 0)))}%`;
    ui.tapCost.textContent = fmt(s.tap_cost || 25);
    ui.passiveCost.textContent = fmt(s.passive_cost || 100);
    ui.profileEmail.textContent = session?.user?.email || (lang === "fa" ? "بازیکن مهمان" : "Guest player");
    ui.playerLabel.textContent = session?.user?.email || (lang === "fa" ? "حالت پیش‌نمایش" : "Preview mode");
    $("dailyClaim").disabled = !!s.daily_claimed;
    $("dailyClaim").textContent = s.daily_claimed ? (lang === "fa" ? "دریافت شد" : "CLAIMED") : t("claim");
    $("dailyClaim").style.opacity = s.daily_claimed ? ".55" : "1";
  }
  function useView(name) {
    document.querySelectorAll(".game-view").forEach(el => el.classList.add("hidden"));
    const view = $(name + "View"); if (view) view.classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === name));
    if (name === "ranking") loadLeaderboard();
    if (name === "profile") ui.profileEmail.textContent = session?.user?.email || "Guest player";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function setLanguage(next) {
    lang = next; document.documentElement.lang = lang; document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", lang === "fa");
    document.querySelectorAll("[data-i18n]").forEach(el => { const key = el.dataset.i18n; if (translations[lang][key]) el.textContent = translations[lang][key]; });
    $("langButton").textContent = lang === "en" ? "EN / FA" : "FA / EN";
    render();
  }
  async function loadState() {
    if (!client || !session) { state = demoState; render(); return; }
    const { data, error } = await client.from("player_state").select("*").eq("user_id", session.user.id).maybeSingle();
    if (error) { say("Could not load player data. Check the Supabase SQL setup."); state = demoState; render(); return; }
    if (!data) { state = demoState; render(); return; }
    state = data; render();
  }
  async function performTap() {
    if (busy) return;
    if (!client || !session) {
      if (demoState.energy <= 0) return say(lang === "fa" ? "انرژی تموم شده؛ کمی صبر کن." : "Out of energy. Wait a little.");
      demoState.energy -= 1; demoState.coins += demoState.tap_power; demoState.level = Math.floor(demoState.coins / 1000) + 1; state = demoState; render();
      floatingCoin(); return;
    }
    busy = true; ui.cat.classList.add("pressed");
    try {
      const { data, error } = await client.rpc("tap_cat");
      if (error) throw error;
      state = Array.isArray(data) ? data[0] : data;
      render(); floatingCoin();
    } catch (e) { say(e.message || "Tap failed. Try again."); }
    finally { busy = false; setTimeout(() => ui.cat.classList.remove("pressed"), 110); }
  }
  function floatingCoin() {
    const el = document.createElement("span"); el.className = "floating-coin"; el.textContent = `+${fmt((state || demoState).tap_power || 1)}`;
    Object.assign(el.style, { position:"fixed", left:`${Math.max(18, Math.min(window.innerWidth-80, ui.cat.getBoundingClientRect().left + ui.cat.offsetWidth/2 - 15))}px`, top:`${ui.cat.getBoundingClientRect().top + 35}px`, zIndex:99, color:"#ffdf8a", fontWeight:"900", fontSize:"18px", pointerEvents:"none", textShadow:"0 2px 15px rgba(255,200,90,.5)", transition:"transform .7s ease, opacity .7s ease" });
    document.body.appendChild(el); requestAnimationFrame(() => { el.style.transform = "translateY(-65px) scale(1.15)"; el.style.opacity = "0"; }); setTimeout(() => el.remove(), 750);
  }
  async function buyUpgrade(kind) {
    if (!client || !session) {
      const costKey = kind === "tap" ? "tap_cost" : "passive_cost";
      const cost = demoState[costKey];
      if (demoState.coins < cost) return say(lang === "fa" ? "سکه کافی نداری." : "Not enough coins.");
      demoState.coins -= cost;
      if (kind === "tap") { demoState.tap_power += 1; demoState.tap_cost = Math.ceil(cost * 1.65); }
      else { demoState.passive_per_hour += 10; demoState.passive_cost = Math.ceil(cost * 1.8); }
      demoState.level = Math.floor(demoState.coins / 1000) + 1; state = demoState; render();
      return say(lang === "fa" ? "ارتقا انجام شد! برای ذخیره شدن وارد حساب شو." : "Upgrade complete! Sign in to save your progress.");
    }
    try {
      const { data, error } = await client.rpc("buy_upgrade", { upgrade_kind: kind });
      if (error) throw error;
      state = Array.isArray(data) ? data[0] : data; render();
      say(lang === "fa" ? "ارتقا با موفقیت انجام شد!" : "Upgrade purchased!");
    } catch (e) { say(e.message || "Upgrade failed."); }
  }
  async function claimDaily() {
    if (!client || !session) {
      if (demoState.daily_claimed) return say(lang === "fa" ? "جایزه امروز رو گرفتی." : "Today's reward is already claimed.");
      demoState.coins += 100; demoState.daily_claimed = true; state = demoState; render();
      return say(lang === "fa" ? "۱۰۰ سکه گرفتی! برای ذخیره وارد حساب شو." : "You got 100 coins! Sign in to save it.");
    }
    try {
      const { data, error } = await client.rpc("claim_daily_reward");
      if (error) throw error;
      state = Array.isArray(data) ? data[0] : data; render();
      say(lang === "fa" ? "جایزه روزانه دریافت شد!" : "Daily reward claimed!");
    } catch (e) { say(e.message || "Could not claim reward."); }
  }
  async function loadLeaderboard() {
    if (!client) { ui.leaderboard.innerHTML = `<div class="empty-state">${t("rankingNote")}</div>`; return; }
    const { data, error } = await client.from("leaderboard_public").select("display_name, coins, level").order("coins", { ascending: false }).limit(20);
    if (error || !data?.length) { ui.leaderboard.innerHTML = `<div class="empty-state">${t("rankingNote")}</div>`; return; }
    ui.leaderboard.replaceChildren();
    data.forEach((p, i) => {
      const row = document.createElement("div"); row.className = "leader-row";
      const rank = document.createElement("span"); rank.className = "leader-rank"; rank.textContent = String(i + 1);
      const avatar = document.createElement("span"); avatar.className = "leader-avatar"; avatar.textContent = ["🐱","😺","😸","🐈‍⬛"][i % 4];
      const name = document.createElement("span"); name.className = "leader-name"; name.textContent = p.display_name || "Cat player";
      const coins = document.createElement("span"); coins.className = "leader-coins"; coins.textContent = `${fmt(p.coins)} M`;
      row.append(rank, avatar, name, coins); ui.leaderboard.append(row);
    });
  }
  async function signIn(event) {
    event.preventDefault();
    if (!client) return say(lang === "fa" ? "ابتدا آدرس و کلید عمومی Supabase را در config.js تنظیم کن." : "Add your Supabase URL and public key to config.js first.", ui.authMessage);
    const { error } = await client.auth.signInWithPassword({ email: ui.email.value.trim(), password: ui.password.value });
    if (error) return say(error.message, ui.authMessage);
    ui.authMessage.textContent = "";
  }
  async function signUp() {
    if (!client) return say(lang === "fa" ? "ابتدا config.js را با اطلاعات پروژه Supabase پر کن." : "Configure config.js with your Supabase project first.", ui.authMessage);
    if (ui.password.value.length < 6) return say(lang === "fa" ? "رمز باید حداقل ۶ کاراکتر باشد." : "Password must be at least 6 characters.", ui.authMessage);
    const { error } = await client.auth.signUp({ email: ui.email.value.trim(), password: ui.password.value });
    if (error) return say(error.message, ui.authMessage);
    say(lang === "fa" ? "حساب درخواست شد؛ اگر تأیید ایمیل فعال است، ایمیلت را بررسی کن." : "Signup requested. Check your email if confirmation is enabled.", ui.authMessage);
  }
  async function signOut() { if (client) await client.auth.signOut(); session = null; state = demoState; showAuth(true); render(); }
  async function boot() {
    document.querySelectorAll(".nav-item").forEach(el => el.addEventListener("click", () => useView(el.dataset.view)));
    ui.cat.addEventListener("click", performTap);
    $("tapUpgrade").addEventListener("click", () => buyUpgrade("tap"));
    $("passiveUpgrade").addEventListener("click", () => buyUpgrade("passive"));
    $("dailyClaim").addEventListener("click", claimDaily);
    $("langButton").addEventListener("click", () => setLanguage(lang === "en" ? "fa" : "en"));
    $("accountButton").addEventListener("click", () => { if (session) useView("profile"); else showAuth(true); });
    $("signOutButton").addEventListener("click", signOut);
    ui.authForm.addEventListener("submit", signIn);
    $("signUpButton").addEventListener("click", signUp);
    $("copyInvite").addEventListener("click", async () => {
      if (!session) return say(lang === "fa" ? "برای ساخت لینک دعوت وارد حساب شو." : "Sign in to get your invite link.", $("inviteMessage"));
      const link = `${location.origin}${location.pathname}?ref=${session.user.id}`;
      try { await navigator.clipboard.writeText(link); say(lang === "fa" ? "لینک کپی شد." : "Invite link copied.", $("inviteMessage")); }
      catch { say(link, $("inviteMessage")); }
    });
    if (!client) {
      showAuth(false); state = demoState; render();
      say(lang === "fa" ? "حالت پیش‌نمایش: برای ذخیرهٔ دائمی Supabase را تنظیم کن." : "Preview mode: configure Supabase to save progress.");
      return;
    }
    const { data } = await client.auth.getSession(); session = data.session;
    client.auth.onAuthStateChange((_event, nextSession) => {
      session = nextSession;
      setTimeout(async () => {
        if (session) { showAuth(false); await loadState(); }
        else { showAuth(true); state = demoState; render(); }
      }, 0);
    });
    if (session) { showAuth(false); await loadState(); }
    else showAuth(true);
  }
  boot();
})();