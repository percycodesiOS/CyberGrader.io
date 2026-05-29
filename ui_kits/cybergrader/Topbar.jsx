const Topbar = ({ dateValue, userName }) => {
  const initial = (userName || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <header className="cg-topbar">
      <div className="cg-topbar__left">
        <div
          className="cg-date-pill"
          title="Click to edit school year dates"
        >
          <span className="cg-date-pill__label">TODAY'S DATE</span>
          <span className="cg-date-pill__value">{dateValue}</span>
        </div>
      </div>
      <div className="cg-topbar__center">
        <img
          src="../../assets/cybergrader-logo.png"
          alt="CyberGrader.io"
          className="cg-topbar__logo"
        />
      </div>
      <div className="cg-topbar__right">
        <div className="cg-topbar__stack">
          <button className="cg-user-chip" type="button">
            <span className="cg-user-chip__avatar">{initial}</span>
            <span>{userName}</span>
            <span className="cg-user-chip__caret">▾</span>
          </button>
          <button
            className="cg-howto-btn"
            type="button"
            title="How to Use"
            aria-label="How to Use"
          >
            ⓘ
          </button>
        </div>
      </div>
    </header>
  );
};

Object.assign(window, { Topbar });
