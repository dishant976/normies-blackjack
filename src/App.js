import { useState, useCallback, useEffect, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// NORMIES BLACKJACK — On-Chain Casino
// Matches normies.art design: monochrome #48494b + #e3e5e4
// Cards show REAL on-chain SVGs from api.normies.art
// Low pixels = high value · Trait combos = bonus payouts
// ═══════════════════════════════════════════════════════════════

const API = "https://api.normies.art";

// THE TWO NORMIE COLORS — everything uses these
const DARK = "#48494b";
const LIGHT = "#e3e5e4";
const BG = LIGHT;
const FG = DARK;
const MID = "#9a9b9d";
const FAINT = "#c8cac9";
const ACCENT = DARK;

// Subtle trait tints (very desaturated – stay close to monochrome aesthetic)
const TRAIT_COLORS = {
  Human: "#e0d8d0",   // very light warm beige
  Cat:   "#d0e0e0",   // very pale cyan
  Agent: "#e0e0d8",   // very pale warm gray-yellow
  Alien: "#d0e0d8",   // very pale mint
};

// ─── DECK OF 52 NORMIES ─────────────────────────────────
// Each card is a real Normie token ID with known pixel count + traits
const NORMIE_DECK = [
  // LEGENDARY (Ace) — lowest pixels, rarest
  { id: 7401, px: 408, type: "Alien" },
  { id: 3841, px: 415, type: "Agent" },
  { id: 8856, px: 421, type: "Cat" },
  { id: 1192, px: 435, type: "Human" },
  // EPIC (King)
  { id: 4054, px: 442, type: "Agent" },
  { id: 6691, px: 449, type: "Alien" },
  { id: 2381, px: 455, type: "Human" },
  { id: 9073, px: 463, type: "Cat" },
  // EPIC (Queen)
  { id: 1898, px: 472, type: "Alien" },
  { id: 5142, px: 479, type: "Human" },
  { id: 8317, px: 485, type: "Agent" },
  { id: 3509, px: 498, type: "Cat" },
  // RARE (Jack)
  { id: 6320, px: 504, type: "Human" },
  { id: 4829, px: 511, type: "Alien" },
  { id: 7156, px: 518, type: "Agent" },
  { id: 2044, px: 523, type: "Cat" },
  // RARE (10)
  { id: 5665, px: 528, type: "Cat" },
  { id: 8774, px: 533, type: "Agent" },
  { id: 3036, px: 538, type: "Human" },
  { id: 9548, px: 544, type: "Alien" },
  // UNCOMMON (9)
  { id: 4594, px: 548, type: "Cat" },
  { id: 4335, px: 553, type: "Human" },
  { id: 2699, px: 557, type: "Alien" },
  { id: 7887, px: 560, type: "Agent" },
  // UNCOMMON (8)
  { id: 2196, px: 563, type: "Agent" },
  { id: 5719, px: 567, type: "Human" },
  { id: 9609, px: 571, type: "Cat" },
  { id: 235, px: 575, type: "Alien" },
  // COMMON (7)
  { id: 5998, px: 578, type: "Agent" },
  { id: 9524, px: 582, type: "Cat" },
  { id: 2532, px: 586, type: "Human" },
  { id: 5862, px: 590, type: "Alien" },
  // COMMON (6)
  { id: 3732, px: 593, type: "Cat" },
  { id: 9612, px: 597, type: "Human" },
  { id: 294, px: 602, type: "Agent" },
  { id: 487, px: 608, type: "Alien" },
  // COMMON (5)
  { id: 5861, px: 613, type: "Human" },
  { id: 7394, px: 618, type: "Cat" },
  { id: 2777, px: 623, type: "Agent" },
  { id: 9097, px: 629, type: "Alien" },
  // COMMON (4)
  { id: 1503, px: 634, type: "Human" },
  { id: 6188, px: 640, type: "Cat" },
  { id: 3921, px: 647, type: "Agent" },
  { id: 8045, px: 654, type: "Alien" },
  // COMMON (3)
  { id: 4412, px: 659, type: "Human" },
  { id: 7703, px: 665, type: "Cat" },
  { id: 1089, px: 672, type: "Agent" },
  { id: 5234, px: 679, type: "Alien" },
  // COMMON (2)
  { id: 8901, px: 685, type: "Human" },
  { id: 3367, px: 692, type: "Cat" },
  { id: 6578, px: 698, type: "Agent" },
  { id: 2089, px: 706, type: "Alien" },
];

// ─── PIXEL → RANK MAPPING ───────────────────────────────
const RANKS = [
  { name: "A", min: 0,   max: 439, val: 11, rarity: "LEGENDARY" },
  { name: "K", min: 440, max: 470, val: 10, rarity: "EPIC" },
  { name: "Q", min: 471, max: 500, val: 10, rarity: "EPIC" },
  { name: "J", min: 501, max: 525, val: 10, rarity: "RARE" },
  { name: "10", min: 526, max: 545, val: 10, rarity: "RARE" },
  { name: "9", min: 546, max: 560, val: 9,  rarity: "UNCOMMON" },
  { name: "8", min: 561, max: 575, val: 8,  rarity: "UNCOMMON" },
  { name: "7", min: 576, max: 590, val: 7,  rarity: "COMMON" },
  { name: "6", min: 591, max: 610, val: 6,  rarity: "COMMON" },
  { name: "5", min: 611, max: 630, val: 5,  rarity: "COMMON" },
  { name: "4", min: 631, max: 655, val: 4,  rarity: "COMMON" },
  { name: "3", min: 656, max: 680, val: 3,  rarity: "COMMON" },
  { name: "2", min: 681, max: 9999, val: 2, rarity: "COMMON" },
];

const getRank = px => RANKS.find(r => px >= r.min && px <= r.max) || RANKS[RANKS.length - 1];

function buildDeck() {
  const deck = NORMIE_DECK.map(n => {
    const rank = getRank(n.px);
    return {
      ...n,
      rank: rank.name,
      val: rank.val,
      rarity: rank.rarity,
      imgUrl: `${API}/normie/${n.id}/image.svg`,
      faceUp: false,
    };
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(cards) {
  let t = 0, a = 0;
  for (const c of cards) {
    if (c.rank === "A") { a++; t += 11; }
    else t += c.val;
  }
  while (t > 21 && a > 0) { t -= 10; a--; }
  return t;
}

const handPx = cards => cards.reduce((s, c) => s + c.px, 0);

// ─── COMBO DETECTION ─────────────────────────────────────
function detectCombos(cards) {
  const combos = [];
  const types = cards.map(c => c.type);
  const uTypes = [...new Set(types)];
  const val = handValue(cards);
  const rarities = cards.map(c => c.rarity);

  if (val === 21 && cards.length === 2) {
    if (types.includes("Alien")) combos.push({ name: "ALIEN BLACKJACK", desc: "Natural 21 with Alien", mult: 3.0 });
    else combos.push({ name: "NORMIE BLACKJACK", desc: "Natural 21", mult: 1.5 });
  }
  if (val === 21 && cards.length > 2) combos.push({ name: "PIXEL PERFECT", desc: "Exactly 21 with 3+ cards", mult: 2.0 });
  if (cards.length >= 2 && types[0] === types[1]) {
    const t = types[0];
    if (t === "Cat") combos.push({ name: "CAT PAIR", desc: "Bust insurance", bonus: "insurance" });
    else if (t === "Agent") combos.push({ name: "DOUBLE AGENTS", desc: "Peek at hole card", bonus: "peek" });
    else if (t === "Alien") combos.push({ name: "ALIEN SYNC", desc: "Hand value −1", bonus: "reduce" });
    else combos.push({ name: "HUMAN PAIR", desc: "+200 chips", bonus: "chips200" });
  }
  if (uTypes.length >= 4) combos.push({ name: "FULL SPECTRUM", desc: "All 4 types → +500", bonus: "chips500" });
  if (rarities.filter(r => r === "LEGENDARY").length >= 2) combos.push({ name: "WHALE HAND", desc: "Two Aces → ×2", mult: 2.0 });
  if (handPx(cards) < 900 && cards.length >= 2) combos.push({ name: "MIN PIXELS", desc: "Low pixel bonus → +25%", mult: 1.25 });
  return combos;
}

// ═══════════════════════════════════════════════════════════════
export default function NormiesBlackjack() {
  const [tab, setTab] = useState("play");
  const [chips, setChips] = useState(1000);
  const [bet, setBet] = useState(100);
  const [deck, setDeck] = useState([]);
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [phase, setPhase] = useState("bet");
  const [result, setResult] = useState(null);
  const [combos, setCombos] = useState([]);
  const [payout, setPayout] = useState(0);
  const [insurance, setInsurance] = useState(false);
  const [peekOn, setPeekOn] = useState(false);
  const [history, setHistory] = useState([]);
  const [imgLoaded, setImgLoaded] = useState({});
  const [imgError, setImgError] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);

  const F = "'Courier New', 'Lucida Console', monospace";

  // Preload images
  useEffect(() => {
    NORMIE_DECK.forEach(n => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setImgLoaded(p => ({ ...p, [n.id]: true }));
      img.onerror = () => setImgError(p => ({ ...p, [n.id]: true }));
      img.src = `${API}/normie/${n.id}/image.svg`;
    });
  }, []);

  const deal = useCallback(() => {
    if (bet > chips) return;
    const d = buildDeck();
    const p = [{ ...d[0], faceUp: true }, { ...d[1], faceUp: true }];
    const dl = [{ ...d[2], faceUp: true }, { ...d[3], faceUp: false }];
    setDeck(d.slice(4));
    setPlayer(p);
    setDealer(dl);
    setPhase("play");
    setResult(null);
    setCombos([]);
    setPayout(0);
    setPeekOn(false);
    setInsurance(false);
    const c = detectCombos(p);
    setCombos(c);
    if (c.find(x => x.bonus === "peek")) setPeekOn(true);
    if (c.find(x => x.bonus === "insurance")) setInsurance(true);
    if (handValue(p) === 21) setTimeout(() => resolve(p, dl, d.slice(4)), 700);
  }, [bet, chips]);

  const hit = useCallback(() => {
    if (phase !== "play" || !deck.length) return;
    const card = { ...deck[0], faceUp: true };
    const np = [...player, card];
    const nd = deck.slice(1);
    setPlayer(np);
    setDeck(nd);
    const c = detectCombos(np);
    setCombos(c);
    if (c.find(x => x.bonus === "peek")) setPeekOn(true);
    const v = handValue(np);
    if (v > 21) {
      if (insurance) {
        setInsurance(false);
        setPlayer(np.slice(0, -1));
        setCombos(detectCombos(np.slice(0, -1)));
        return;
      }
      setTimeout(() => resolve(np, dealer, nd), 350);
    } else if (v === 21) setTimeout(() => resolve(np, dealer, nd), 350);
  }, [phase, deck, player, dealer, insurance]);

  const stand = useCallback(() => {
    if (phase === "play") resolve(player, dealer, deck);
  }, [phase, player, dealer, deck]);

  const dbl = useCallback(() => {
    if (phase !== "play" || player.length !== 2 || bet * 2 > chips) return;
    setBet(b => b * 2);
    const card = { ...deck[0], faceUp: true };
    const np = [...player, card];
    const nd = deck.slice(1);
    setPlayer(np);
    setDeck(nd);
    setCombos(detectCombos(np));
    if (handValue(np) > 21 && insurance) {
      setInsurance(false);
      setPlayer(np.slice(0, -1));
      return;
    }
    setTimeout(() => resolve(np, dealer, nd), 500);
  }, [phase, player, dealer, deck, bet, chips, insurance]);

  const resolve = useCallback((pC, dC, rem) => {
    setPhase("dealer");
    let dlr = dC.map(c => ({ ...c, faceUp: true }));
    setDealer(dlr);
    let rd = [...rem];
    const draw = () => {
      if (handValue(dlr) < 17 && rd.length) {
        dlr = [...dlr, { ...rd[0], faceUp: true }];
        rd = rd.slice(1);
        setDealer([...dlr]);
        setDeck([...rd]);
        setTimeout(draw, 450);
      } else fin(pC, dlr);
    };
    setTimeout(draw, 500);
  }, []);

  const fin = useCallback((pC, dC) => {
    const pV = handValue(pC), dV = handValue(dC);
    const pP = handPx(pC), dP = handPx(dC);
    const allC = detectCombos(pC);
    setCombos(allC);
    let res, mult = 1;
    if (pV > 21) { res = "BUST"; mult = 0; }
    else if (dV > 21) { res = "DEALER BUSTS"; mult = 2; }
    else if (pV > dV) { res = "YOU WIN"; mult = 2; }
    else if (pV < dV) { res = "DEALER WINS"; mult = 0; }
    else {
      if (pP < dP) { res = "TIE → LOW PX WINS"; mult = 2; }
      else if (pP > dP) { res = "TIE → DEALER LOW PX"; mult = 0; }
      else { res = "PUSH"; mult = 1; }
    }
    let bonus = 0;
    for (const c of allC) {
      if (c.mult && mult > 0) mult = Math.max(mult, c.mult);
      if (c.bonus === "chips200") bonus += 200;
      if (c.bonus === "chips500") bonus += 500;
    }
    if (pV === 21 && pC.length === 2 && mult > 0) {
      mult = Math.max(mult, allC.find(c => c.name.includes("BLACKJACK"))?.mult || 1.5);
    }
    const pay = Math.floor(bet * mult) + bonus;
    setChips(ch => ch - bet + pay);
    setPayout(pay);
    setResult(res);
    setPhase("result");
    setHistory(h => [...h.slice(-9), { res, pV, dV, pP, dP, bet, pay, combos: allC.map(c => c.name) }]);
  }, [bet]);

  const next = useCallback(() => {
    setBet(b => Math.min(b, chips));
    setPhase("bet");
    setPlayer([]);
    setDealer([]);
    setCombos([]);
    setResult(null);
    setPeekOn(false);
    setInsurance(false);
  }, [chips]);

  const reset = () => {
    setChips(1000);
    setBet(100);
    next();
    setHistory([]);
  };

  // ─── CARD RENDERING ────────────────────────────────────
  const NormieCard = ({ card, hidden, size = "normal", onClick = null }) => {
    let w = size === "sm" ? 72 : 96;
    let h = size === "sm" ? 108 : 140;
    let imgSz = size === "sm" ? 48 : 68;
    if (size === "large") { w = 240; h = 360; imgSz = 170; }

    const traitColor = TRAIT_COLORS[card.type] || FAINT;

    if (hidden && !peekOn) {
      return (
        <div style={{
          width: w, height: h, background: FG, border: `2px solid ${FG}`,
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative"
        }}>
          <div style={{ position: "absolute", inset: 5, border: `1px solid ${MID}` }} />
          <div style={{ color: MID, fontSize: size === "sm" ? 20 : 28, fontFamily: F, fontWeight: 900 }}>?</div>
          <div style={{ position: "absolute", inset: 8, opacity: 0.15 }}>
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: 4 }).map((_, c) => (
                  <div key={c} style={{ width: "25%", aspectRatio: "1", border: `0.5px solid ${LIGHT}` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const loaded = imgLoaded[card.id];
    const errored = imgError[card.id];

    return (
      <div
        onClick={onClick}
        style={{
          width: w,
          height: h,
          background: LIGHT,
          border: `2px solid ${traitColor}`,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.18s ease",
          cursor: onClick ? "pointer" : "default",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
        onMouseEnter={e => { if (onClick) e.currentTarget.style.transform = "scale(1.04)"; }}
        onMouseLeave={e => { if (onClick) e.currentTarget.style.transform = "scale(1)"; }}
      >
        {/* Rank top-left */}
        <div style={{ position: "absolute", top: 3, left: 5, zIndex: 2 }}>
          <div style={{ fontSize: size === "sm" ? 14 : 18, fontWeight: 900, color: FG, fontFamily: F, lineHeight: 1 }}>
            {card.rank}
          </div>
          <div style={{ fontSize: size === "sm" ? 7 : 8, color: MID, fontFamily: F }}>
            {card.px}px
          </div>
        </div>

        {/* Type top-right with trait color bg */}
        <div style={{
          position: "absolute",
          top: 3,
          right: 4,
          zIndex: 2,
          textAlign: "right",
          background: `${traitColor}cc`,
          padding: "1px 5px",
          borderRadius: 2
        }}>
          <div style={{ fontSize: size === "sm" ? 6 : 7, color: MID, fontFamily: F, letterSpacing: 0.5 }}>
            {card.rarity}
          </div>
          <div style={{ fontSize: size === "sm" ? 7 : 8, color: FG, fontFamily: F }}>
            {card.type}
          </div>
        </div>

        {/* ON-CHAIN SVG IMAGE */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: size === "sm" ? 24 : 28 }}>
          {!errored ? (
            <img
              src={card.imgUrl}
              alt={`Normie #${card.id}`}
              crossOrigin="anonymous"
              style={{
                width: imgSz,
                height: imgSz,
                imageRendering: "pixelated",
                border: `1px solid ${traitColor}`,
                background: LIGHT
              }}
              onError={() => setImgError(p => ({ ...p, [card.id]: true }))}
            />
          ) : (
            <div style={{
              width: imgSz,
              height: imgSz,
              background: LIGHT,
              border: `1px solid ${traitColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <div style={{ fontSize: size === "sm" ? 9 : 11, color: MID, fontFamily: F, textAlign: "center" }}>
                #{card.id}
              </div>
            </div>
          )}
        </div>

        {/* Value bottom */}
        <div style={{ textAlign: "center", padding: "2px 0 4px" }}>
          <span style={{ fontSize: size === "sm" ? 7 : 8, color: MID, fontFamily: F }}>
            VAL:{card.val}
          </span>
        </div>

        {/* Rank bottom-right rotated */}
        <div style={{ position: "absolute", bottom: 3, right: 5, transform: "rotate(180deg)" }}>
          <div style={{ fontSize: size === "sm" ? 11 : 14, fontWeight: 900, color: FG, fontFamily: F }}>
            {card.rank}
          </div>
        </div>
      </div>
    );
  };

  const pVal = handValue(player);
  const dVal = phase === "result" || phase === "dealer" ? handValue(dealer) : handValue(dealer.filter(c => c.faceUp));
  const alienReduce = combos.find(c => c.bonus === "reduce") ? 1 : 0;
  const dispPVal = Math.max(0, pVal - alienReduce);

  // ─── BTN STYLE ─────────────────────────────────────────
  const btn = (active = true) => ({
    padding: "10px 24px",
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: F,
    fontWeight: 700,
    cursor: active ? "pointer" : "not-allowed",
    textTransform: "uppercase",
    background: active ? FG : FAINT,
    color: active ? LIGHT : MID,
    border: "none",
    transition: "opacity 0.15s",
    opacity: active ? 1 : 0.5,
  });

  const btnOutline = () => ({
    padding: "10px 24px",
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: F,
    fontWeight: 700,
    cursor: "pointer",
    textTransform: "uppercase",
    background: "transparent",
    color: FG,
    border: `2px solid ${FG}`,
  });

  // Sorted deck for Traits tab
  const sortedDeck = useMemo(() => {
    return NORMIE_DECK.map(n => {
      const rank = getRank(n.px);
      return {
        ...n,
        rank: rank.name,
        val: rank.val,
        rarity: rank.rarity,
        imgUrl: `${API}/normie/${n.id}/image.svg`,
      };
    }).sort((a, b) => a.px - b.px);
  }, []);

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: BG,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: F,
      color: FG
    }}>

      {/* HEADER */}
      <div style={{ width: "100%", padding: "20px 0 0", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: 6, color: FG }}>NORMIES</h1>
        <div style={{ fontSize: 11, letterSpacing: 4, color: MID, marginTop: 2 }}>On-Chain Generative Faces</div>
      </div>

      {/* NAV */}
      <nav style={{ display: "flex", gap: 0, margin: "16px 0 20px", border: `2px solid ${FG}` }}>
        {[
          { key: "play", label: "Blackjack" },
          { key: "combos", label: "Combos" },
          { key: "traits", label: "Traits" },
          { key: "rules", label: "Rules" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px",
              fontSize: 11,
              letterSpacing: 2,
              fontFamily: F,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
              background: tab === t.key ? FG : "transparent",
              color: tab === t.key ? LIGHT : FG,
              border: "none",
              borderRight: `1px solid ${FG}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ══════════ PLAY TAB ══════════ */}
      {tab === "play" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 520, padding: "0 12px", boxSizing: "border-box" }}>

          {/* HUD */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "10px 0", borderTop: `2px solid ${FG}`, borderBottom: `2px solid ${FG}` }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: 3, color: MID }}>BANKROLL</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{chips.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 8, letterSpacing: 3, color: MID }}>BET</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{bet}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {insurance && <div style={{ fontSize: 9, letterSpacing: 1 }}>⬟ INSURED</div>}
              {peekOn && <div style={{ fontSize: 9, letterSpacing: 1 }}>◉ PEEK</div>}
              <div style={{ fontSize: 8, color: MID }}>HI: {Math.max(0, ...history.map(h => h.pay))}</div>
            </div>
          </div>

          {/* BET PHASE */}
          {phase === "bet" && (
            <div style={{ width: "100%", textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 12, letterSpacing: 4, color: MID, marginBottom: 20 }}>PLACE YOUR BET</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[25, 50, 100, 250, 500].map(v => (
                  <button
                    key={v}
                    onClick={() => setBet(Math.min(v, chips))}
                    style={{
                      width: 56,
                      height: 56,
                      background: bet === v ? FG : "transparent",
                      border: `2px solid ${FG}`,
                      color: bet === v ? LIGHT : FG,
                      fontSize: 12,
                      fontWeight: 900,
                      fontFamily: F,
                      cursor: v <= chips ? "pointer" : "not-allowed",
                      opacity: v <= chips ? 1 : 0.3,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={deal} disabled={bet > chips || chips <= 0} style={btn(bet <= chips && chips > 0)}>
                DEAL
              </button>
              {chips <= 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, marginBottom: 8 }}>BANKROLL EMPTY</div>
                  <button onClick={reset} style={btnOutline()}>REBUY 1,000</button>
                </div>
              )}
              {history.length > 0 && (
                <div style={{ marginTop: 24, textAlign: "left", borderTop: `1px solid ${FAINT}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 8, letterSpacing: 3, color: MID, marginBottom: 8 }}>LAST HANDS</div>
                  {history.slice(-5).reverse().map((h, i) => (
                    <div key={i} style={{ fontSize: 9, color: MID, display: "flex", gap: 8, marginBottom: 3 }}>
                      <span style={{ color: FG, minWidth: 100 }}>{h.res}</span>
                      <span>{h.pV} vs {h.dV}</span>
                      <span style={{ color: h.pay > h.bet ? FG : MID }}>
                        {h.pay > h.bet ? `+${h.pay - h.bet}` : h.pay === 0 ? `-${h.bet}` : "push"}
                      </span>
                      {h.combos.length > 0 && <span>{h.combos.join(", ")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PLAYING / RESULT */}
          {phase !== "bet" && (
            <div style={{ width: "100%" }}>

              {/* DEALER */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: MID, marginBottom: 8 }}>
                  DEALER {(phase === "result" || phase === "dealer") ? (
                    <span style={{ fontWeight: 900, fontSize: 16, color: FG }}> {dVal}</span>
                  ) : (
                    <span style={{ color: MID }}> ({dVal})</span>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  {dealer.map((c, i) => (
                    <NormieCard key={i} card={c} hidden={!c.faceUp && phase === "play"} />
                  ))}
                </div>
              </div>

              {/* DIVIDER */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
                <div style={{ flex: 1, height: 2, background: FG }} />
                <span style={{ fontSize: 9, letterSpacing: 4, color: MID }}>VS</span>
                <div style={{ flex: 1, height: 2, background: FG }} />
              </div>

              {/* PLAYER */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: MID, marginBottom: 8 }}>
                  YOU <span style={{ fontWeight: 900, fontSize: 16, color: pVal > 21 ? MID : FG }}>{dispPVal}</span>
                  {alienReduce > 0 && <span style={{ fontSize: 8, color: MID }}> (−{alienReduce})</span>}
                  <span style={{ fontSize: 8, color: MID }}> · {handPx(player)}px</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  {player.map((c, i) => <NormieCard key={i} card={c} />)}
                </div>
              </div>

              {/* COMBOS */}
              {combos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, margin: "10px 0" }}>
                  {combos.map((c, i) => (
                    <div key={i} style={{
                      padding: "4px 10px",
                      border: `1px solid ${FG}`,
                      fontSize: 8,
                      fontWeight: 700,
                      letterSpacing: 1,
                      color: FG
                    }}>
                      {c.name} {c.mult ? `×${c.mult}` : ""}
                    </div>
                  ))}
                </div>
              )}

              {/* ACTIONS */}
              {phase === "play" && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12, marginBottom: 16 }}>
                  <button onClick={hit} style={btn()}>HIT</button>
                  <button onClick={stand} style={btnOutline()}>STAND</button>
                  {player.length === 2 && bet * 2 <= chips && (
                    <button onClick={dbl} style={btnOutline()}>DOUBLE</button>
                  )}
                </div>
              )}

              {/* RESULT */}
              {phase === "result" && result && (
                <div style={{ textAlign: "center", padding: "20px 0", borderTop: `2px solid ${FG}`, borderBottom: `2px solid ${FG}`, margin: "12px 0" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>{result}</div>
                  <div style={{ fontSize: 11, color: MID, marginTop: 6 }}>
                    {payout > bet && <span>+{payout - bet} chips</span>}
                    {payout === 0 && <span>−{bet} chips</span>}
                    {payout === bet && <span>Bet returned</span>}
                  </div>
                  <button onClick={next} style={{ ...btn(), marginTop: 16 }}>NEXT HAND</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ COMBOS TAB ══════════ */}
      {tab === "combos" && (
        <div style={{ width: "100%", maxWidth: 520, padding: "0 12px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, textAlign: "center", marginBottom: 16 }}>TRAIT COMBOS & BONUSES</div>
          {[
            { n: "NORMIE BLACKJACK", d: "Natural 21 in 2 cards", e: "×1.5 payout" },
            { n: "ALIEN BLACKJACK", d: "Natural 21 with an Alien card", e: "×3 payout" },
            { n: "PIXEL PERFECT", d: "Exactly 21 with 3+ cards", e: "×2 payout" },
            { n: "WHALE HAND", d: "Two Legendary (Ace) cards", e: "×2 payout" },
            { n: "MIN PIXELS", d: "Hand total under 900px", e: "+25% payout" },
            { n: "CAT PAIR", d: "Two Cat types dealt", e: "Survive one bust" },
            { n: "DOUBLE AGENTS", d: "Two Agent types dealt", e: "See hole card" },
            { n: "ALIEN SYNC", d: "Two Alien types dealt", e: "Hand value −1" },
            { n: "HUMAN PAIR", d: "Two Human types dealt", e: "+200 chips" },
            { n: "FULL SPECTRUM", d: "All 4 types in hand", e: "+500 chips" },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${FAINT}` }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{c.n}</div>
                <div style={{ fontSize: 9, color: MID, marginTop: 2 }}>{c.d}</div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, whiteSpace: "nowrap", marginLeft: 12 }}>{c.e}</div>
            </div>
          ))}

          <div style={{ marginTop: 24, fontSize: 11, letterSpacing: 4, textAlign: "center", marginBottom: 12 }}>PIXEL → CARD VALUE</div>
          <div style={{ fontSize: 9, color: MID, textAlign: "center", marginBottom: 12 }}>Lower pixels = rarer Normie = higher card value</div>
          <div style={{ borderTop: `2px solid ${FG}` }}>
            <div style={{ display: "flex", padding: "6px 0", borderBottom: `1px solid ${FG}`, fontWeight: 700, fontSize: 9, letterSpacing: 1 }}>
              <span style={{ width: 80 }}>RARITY</span>
              <span style={{ width: 40 }}>CARD</span>
              <span style={{ flex: 1 }}>PIXELS</span>
              <span style={{ width: 40, textAlign: "right" }}>VAL</span>
            </div>
            {RANKS.map((r, i) => (
              <div key={i} style={{ display: "flex", padding: "4px 0", borderBottom: `1px solid ${FAINT}`, fontSize: 9, color: i < 4 ? FG : MID }}>
                <span style={{ width: 80, fontWeight: i < 4 ? 700 : 400 }}>{r.rarity}</span>
                <span style={{ width: 40, fontWeight: 700, color: FG }}>{r.name}</span>
                <span style={{ flex: 1 }}>{r.min}–{r.max === 9999 ? "700+" : r.max}px</span>
                <span style={{ width: 40, textAlign: "right", color: FG }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ TRAITS TAB ══════════ */}
      {tab === "traits" && (
        <div style={{ width: "100%", maxWidth: 880, padding: "0 12px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, textAlign: "center", marginBottom: 16 }}>
            FULL DECK — SORTED BY PIXELS (lowest = rarest)
          </div>

          {/* Trait color legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
            {Object.entries(TRAIT_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  border: `2px solid ${FG}`,
                  borderRadius: 3
                }} />
                <span style={{ fontSize: 11, color: MID }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Deck grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
            gap: 16,
            justifyItems: "center"
          }}>
            {sortedDeck.map((c, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <NormieCard
                  card={c}
                  size="sm"
                  onClick={() => setSelectedCard(c)}
                />
                <div style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: MID,
                  lineHeight: 1.3
                }}>
                  #{c.id}<br />
                  {c.px}px · {c.type}
                </div>
              </div>
            ))}
          </div>

          {/* Zoom modal */}
          {selectedCard && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                transition: "opacity 0.3s ease-in-out",
                opacity: 1,
              }}
              onClick={() => setSelectedCard(null)}
            >
              <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", textAlign: "center" }}>
                <NormieCard card={selectedCard} size="large" />
                <div style={{ marginTop: 16, fontSize: 12, color: MID }}>
                  Rarity: {selectedCard.rarity} · Type: {selectedCard.type} · Pixels: {selectedCard.px}
                </div>
                <a
                  href={`https://opensea.io/assets/ethereum/0x9eb6e2025b64f340691e424b7fe7022ffde12438/${selectedCard.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 8, color: FG, textDecoration: "underline" }}
                >
                  View Real Data on OpenSea
                </a>
                <button
                  onClick={() => setSelectedCard(null)}
                  style={{
                    position: "absolute",
                    top: -50,
                    right: -50,
                    background: FG,
                    color: LIGHT,
                    border: "none",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    fontSize: 20,
                    cursor: "pointer"
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ RULES TAB ══════════ */}
      {tab === "rules" && (
        <div style={{ width: "100%", maxWidth: 520, padding: "0 12px", boxSizing: "border-box" }}>
          {[
            { q: "How does it work?", a: "Standard Blackjack rules but every card is a real Normie from the on-chain collection. Each Normie's Pixel Count (number of dark pixels in its 40×40 bitmap) determines its card value. Lower pixels = rarer = higher value." },
            { q: "What breaks ties?", a: "When both hands equal the same value, the hand with LOWER total pixel count wins. This rewards rare, low-pixel Normies. If pixels also match, it's a push." },
            { q: "What are trait combos?", a: "Each Normie has a Type (Human, Cat, Alien, Agent). Certain type combinations trigger bonuses: Cat Pair gives bust insurance, Double Agents reveals the hole card, Alien Sync reduces your hand by 1, Human Pair adds 200 chips. Getting all 4 types adds 500 chips." },
            { q: "What is Alien Blackjack?", a: "A natural 21 with an Alien card in your hand pays 3× instead of the standard 1.5× — Aliens are the most valuable type in the game." },
            { q: "How does Cat Insurance work?", a: "If your first two cards are both Cats, you get bust protection. If you hit and go over 21, the last card is removed instead of losing. Works once per hand." },
            { q: "What is Double Down?", a: "On your first two cards, you can double your bet to receive exactly one more card. High risk, high reward." },
            { q: "Where do the images come from?", a: "Every card shows the actual on-chain SVG from api.normies.art/normie/{id}/image.svg. These are rendered from 200 bytes stored on Ethereum via SSTORE2 and the NormiesRendererV3 contract." },
            { q: "What is the contract address?", a: "Normies: 0x9Eb6E2025B64f340691e424b7fe7022fFDE12438\nStorage: 0x1B976bAf51cF51F0e369C070d47FBc47A706e602\nRendererV3: 0x1af01b902256d77cf9499a14ef4e494897380b05" },
          ].map((item, i) => (
            <details key={i} style={{ borderBottom: `1px solid ${FAINT}` }}>
              <summary style={{ padding: "12px 0", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: MID }}>▸</span> {item.q}
              </summary>
              <div style={{ padding: "0 0 14px 20px", fontSize: 10, lineHeight: 1.7, color: MID, whiteSpace: "pre-line" }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: "auto", padding: "24px 0 16px", textAlign: "center" }}>
        <div style={{ fontSize: 8, letterSpacing: 4, color: MID }}>NORMIES × ETHEREUM × ON-CHAIN</div>
      </div>
    </div>
  );
}