(() => {
  const SUPABASE_URL = "https://cxiyamirmygkwxrtavnl.supabase.co";
  const SUPABASE_KEY = "sb_publishable_opYIyBDyYJ9av58IFeuGig_i1WFnS2D";
  const STORAGE_KEY = "bithouse-content-calendar-v2";
  const ROW_ID = "main";

  const originalSetItem = Storage.prototype.setItem;

  async function readRemoteState() {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_state?id=eq.${encodeURIComponent(ROW_ID)}&select=state`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    if (!response.ok) throw new Error(`Database read failed: ${response.status}`);
    const rows = await response.json();
    return rows[0]?.state || null;
  }

  async function writeRemoteState(value) {
    try {
      const parsed = JSON.parse(value);
      const response = await fetch(`${SUPABASE_URL}/rest/v1/calendar_state`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          id: ROW_ID,
          state: parsed,
          updated_at: new Date().toISOString()
        })
      });
      if (!response.ok) console.warn("BitHouse DB sync failed:", response.status);
    } catch (error) {
      console.warn("BitHouse DB sync error:", error);
    }
  }

  async function boot() {
    try {
      const remoteState = await readRemoteState();
      if (remoteState?.posts) {
        originalSetItem.call(localStorage, STORAGE_KEY, JSON.stringify(remoteState));
      }
    } catch (error) {
      console.warn("BitHouse database unavailable. Using local cache.", error);
    }

    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && key === STORAGE_KEY) {
        writeRemoteState(value);
      }
    };

    const app = document.createElement("script");
    app.src = "script.js";
    app.async = false;
    document.head.appendChild(app);
  }

  boot();
})();
