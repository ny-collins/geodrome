/* ========================================================================== */
/*                            RALPH CREWE TRIBUTE                             */
/* ========================================================================== */

export class CreditModal {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'credit-modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="credit-modal-card">
        <button class="credit-modal-close" id="btn-close-credit">&times;</button>
        <div class="credit-modal-header">
          <div class="credit-badge">Original Concept</div>
          <h2>Great Circle Globe</h2>
        </div>
        <div class="credit-modal-body">
          <p>
            This interactive globe visualizer is based on the original 
            <strong>"Great Circle Globe"</strong> project concept created by science communicator 
            <a href="https://www.ralphcrewe.com/curiosity" target="_blank" rel="noopener noreferrer">Ralph Crewe</a>.
          </p>
          <div class="credit-quote">
            "Vibe-coded to explore geodesics, antipodes, and spherical mathematics."
          </div>
          <p>
            This modernized open-source edition enhances the original prototype with TypeScript, 
            optimized WebGL rendering, responsive projections, and memory management.
          </p>
        </div>
        <div class="credit-modal-footer">
          <a href="https://www.ralphcrewe.com/curiosity" target="_blank" rel="noopener noreferrer" class="globe-btn btn-tribute">
            Visit Ralph Crewe's Website
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    const closeBtn = this.overlay.querySelector('#btn-close-credit');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
  }

  public show(): void {
    this.overlay.classList.remove('hidden');
  }

  public hide(): void {
    this.overlay.classList.add('hidden');
  }
}
