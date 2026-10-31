/** The visible chat bubble is no longer loaded: voice goes through the invisible kiosk widget. */
export function IntegrationStatus() {
  return (
    <aside className="integration" data-status="ready">
      <span className="integration-icon" aria-hidden="true">
        ↗
      </span>
      <div>
        <strong>Voz de Able · modo kiosco</strong>
        <p>
          El widget de Able es invisible y la charla se hace con Able en pantalla, en{" "}
          <a href="./totem.html">/totem.html</a>. Para probar sin backend: el simulador de este
          laboratorio o <a href="./totem.html?simulate">/totem.html?simulate</a>.
        </p>
      </div>
      <span className="tag">Sin burbuja de chat</span>
    </aside>
  );
}
