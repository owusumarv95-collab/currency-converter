import { useState, useEffect, useCallback } from "react";

const CURRENCIES = [
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸", symbol: "$" },
  { code: "THB", name: "Thai Baht", flag: "🇹🇭", symbol: "฿" },
  { code: "GBP", name: "Brit. Pfund", flag: "🇬🇧", symbol: "£" },
  { code: "JPY", name: "Japanischer Yen", flag: "🇯🇵", symbol: "¥" },
  { code: "CHF", name: "Schweizer Franken", flag: "🇨🇭", symbol: "Fr" },
];

// Fallback rates relative to EUR (in case API fails)
const FALLBACK_RATES = {
  EUR: 1,
  USD: 1.085,
  THB: 38.5,
  GBP: 0.856,
  JPY: 163.2,
  CHF: 0.972,
};

const CACHE_KEY = "currency_rates_cache";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export default function CurrencyConverter() {
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromCurrency, setFromCurrency] = useState("EUR");
  const [toCurrency, setToCurrency] = useState("THB");
  const [fromAmount, setFromAmount] = useState("100");
  const [toAmount, setToAmount] = useState("");

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Load cached rates from localStorage
  const loadCachedRates = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { rates: cachedRates, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return { rates: cachedRates, timestamp };
        }
      }
    } catch {}
    return null;
  };

  const fetchRates = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadCachedRates();
      if (cached) {
        setRates(cached.rates);
        setLastUpdated(new Date(cached.timestamp));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.frankfurter.app/latest?base=EUR&symbols=USD,THB,GBP,JPY,CHF"
      );
      if (!res.ok) throw new Error("API Fehler");
      const data = await res.json();
      const newRates = { EUR: 1, ...data.rates };
      const now = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: newRates, timestamp: now }));
      setRates(newRates);
      setLastUpdated(new Date(now));
    } catch (e) {
      setError("Kurse konnten nicht geladen werden — Fallback-Kurse werden verwendet.");
      setRates(FALLBACK_RATES);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Convert amounts
  useEffect(() => {
    if (fromAmount === "" || fromAmount === "-") {
      setToAmount("");
      return;
    }
    const num = parseFloat(fromAmount.replace(",", "."));
    if (isNaN(num)) { setToAmount(""); return; }
    const inEur = num / rates[fromCurrency];
    const result = inEur * rates[toCurrency];
    setToAmount(formatAmount(result, toCurrency));
  }, [fromAmount, fromCurrency, toCurrency, rates]);

  const handleToAmountChange = (val) => {
    const num = parseFloat(val.replace(",", "."));
    if (isNaN(num)) { setFromAmount(val); return; }
    const inEur = num / rates[toCurrency];
    const result = inEur * rates[fromCurrency];
    setFromAmount(formatAmount(result, fromCurrency));
  };

  const formatAmount = (num, currency) => {
    if (currency === "JPY") return num.toFixed(0);
    if (currency === "THB") return num.toFixed(2);
    return num.toFixed(2);
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formatDate = (date) => {
    if (!date) return "Fallback-Kurse";
    return date.toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const getRate = () => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return "–";
    const r = rates[toCurrency] / rates[fromCurrency];
    return r < 0.01 ? r.toFixed(5) : r.toFixed(4);
  };

  const currencyInfo = (code) => CURRENCIES.find(c => c.code === code);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'SF Pro Display', 'Inter', -apple-system, sans-serif",
      padding: "20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        background: "#242424",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: "17px" }}>Währungsrechner</div>
            <div style={{
              color: loading ? "#f0a500" : error ? "#e05555" : "#4CAF50",
              fontSize: "11px",
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <span style={{
                width: "6px", height: "6px",
                borderRadius: "50%",
                background: loading ? "#f0a500" : error ? "#e05555" : "#4CAF50",
                display: "inline-block"
              }} />
              {loading ? "Lade Kurse…" : `Aktualisiert: ${formatDate(lastUpdated)}`}
            </div>
          </div>
          <button
            onClick={() => fetchRates(true)}
            style={{
              background: "#333",
              border: "none",
              borderRadius: "50%",
              width: "36px", height: "36px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              transition: "background 0.2s",
            }}
            title="Kurse aktualisieren"
          >
            🔄
          </button>
        </div>

        {/* From currency */}
        <div style={{ padding: "24px 24px 0" }}>
          <CurrencyField
            currency={fromCurrency}
            amount={fromAmount}
            onAmountChange={setFromAmount}
            onCurrencyClick={() => { setShowFromPicker(!showFromPicker); setShowToPicker(false); }}
            showPicker={showFromPicker}
            onSelectCurrency={(code) => { setFromCurrency(code); setShowFromPicker(false); }}
            excludeCurrency={toCurrency}
            label="Von"
          />
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
          <button
            onClick={swapCurrencies}
            style={{
              background: "#f0a500",
              border: "none",
              borderRadius: "50%",
              width: "42px", height: "42px",
              cursor: "pointer",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(240,165,0,0.3)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.93)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            ⇅
          </button>
        </div>

        {/* To currency */}
        <div style={{ padding: "0 24px" }}>
          <CurrencyField
            currency={toCurrency}
            amount={toAmount}
            onAmountChange={handleToAmountChange}
            onCurrencyClick={() => { setShowToPicker(!showToPicker); setShowFromPicker(false); }}
            showPicker={showToPicker}
            onSelectCurrency={(code) => { setToCurrency(code); setShowToPicker(false); }}
            excludeCurrency={fromCurrency}
            label="Nach"
          />
        </div>

        {/* Rate display */}
        <div style={{
          margin: "20px 24px",
          padding: "12px 16px",
          background: "#2e2e2e",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ color: "#888", fontSize: "12px" }}>Wechselkurs</span>
          <span style={{ color: "#f0a500", fontSize: "13px", fontWeight: 600 }}>
            1 {fromCurrency} = {getRate()} {toCurrency}
          </span>
        </div>

        {/* Quick amounts */}
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Schnellbeträge
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[100, 500, 1000, 5000].map(amt => (
              <button
                key={amt}
                onClick={() => setFromAmount(String(amt))}
                style={{
                  background: fromAmount === String(amt) ? "#f0a500" : "#333",
                  color: fromAmount === String(amt) ? "#000" : "#ccc",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: fromAmount === String(amt) ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {amt.toLocaleString("de-DE")}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            margin: "0 24px 20px",
            padding: "10px 14px",
            background: "#3a1a1a",
            borderRadius: "10px",
            color: "#e07777",
            fontSize: "12px",
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}

function CurrencyField({ currency, amount, onAmountChange, onCurrencyClick, showPicker, onSelectCurrency, excludeCurrency, label }) {
  const info = CURRENCIES.find(c => c.code === currency);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      <div style={{
        background: "#2e2e2e",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <button
          onClick={onCurrencyClick}
          style={{
            background: "#3a3a3a",
            border: showPicker ? "1px solid #f0a500" : "1px solid transparent",
            borderRadius: "12px",
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            minWidth: "90px",
            transition: "border 0.15s",
          }}
        >
          <span style={{ fontSize: "20px" }}>{info?.flag}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{currency}</div>
            <div style={{ color: "#888", fontSize: "10px" }}>{info?.symbol}</div>
          </div>
          <span style={{ color: "#f0a500", fontSize: "10px", marginLeft: "auto" }}>{showPicker ? "▲" : "▼"}</span>
        </button>

        <input
          type="number"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: "26px",
            fontWeight: 300,
            textAlign: "right",
            width: "0",
          }}
          placeholder="0"
        />
      </div>

      {/* Currency picker dropdown */}
      {showPicker && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          background: "#2e2e2e",
          borderRadius: "14px",
          zIndex: 100,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
          border: "1px solid #444",
        }}>
          {CURRENCIES.filter(c => c.code !== excludeCurrency).map(c => (
            <button
              key={c.code}
              onClick={() => onSelectCurrency(c.code)}
              style={{
                width: "100%",
                background: c.code === currency ? "#3a3a3a" : "transparent",
                border: "none",
                padding: "12px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderBottom: "1px solid #333",
              }}
            >
              <span style={{ fontSize: "20px" }}>{c.flag}</span>
              <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{c.code}</span>
              <span style={{ color: "#888", fontSize: "12px" }}>{c.name}</span>
              {c.code === currency && <span style={{ color: "#f0a500", marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
