import { LitElement, html, css } from "https://unpkg.com/lit-element@2.5.1/lit-element.js?module";

if (!customElements.get('ha-floorplan-card')) {
  customElements.define('ha-floorplan-card', class FloorplanCard extends LitElement {
    static get properties() {
      return {
        hass: { type: Object },
        _config: { type: Object }
      };
    }

    constructor() {
      super();
      this._config = null;
    }

    setConfig(config) {
      if (!config.building) {
        throw new Error("Please define a building configuration");
      }
      this._config = config;
      this.requestUpdate();
    }

    _parseArrangement(floor) {
      return floor.arrangement.map(row => 
        row.split('|')
           .map(cell => cell.trim())
           .filter(cell => cell.length > 0)
      );
    }

// Previous imports and initial code remain the same...

    _renderFloor(floor) {
      const grid = this._parseArrangement(floor);
      const firstRow = grid[0];
      
      // Get all rooms from first row
      const rooms = firstRow.map(id => floor.rooms.find(r => r.id === id))
                          .filter(room => room);
      
      // Dimensions
      const roomWidth = 85;
      const roomHeight = 60;
      const spacing = 15;

      return html`
        <div class="floor">
          <h3>${floor.floor_name} (Level ${floor.floor_level})</h3>
          <div class="svg-container">
            <svg 
              version="1.1"
              width="400"
              height="110"
              style="background: #f0f0f0;"
            >
              <!-- Debug text -->
              <text 
                x="10" 
                y="20" 
                fill="red" 
                style="font-size: 12px;"
              >Rooms: ${rooms.length}</text>

              <!-- Room 1 -->
              <rect 
                x="10" 
                y="30" 
                width="${roomWidth}" 
                height="${roomHeight}" 
                fill="white" 
                stroke="black"
                stroke-width="1"
              />
              <text 
                x="${10 + roomWidth/2}" 
                y="55" 
                fill="black" 
                text-anchor="middle"
                style="font-size: 9px; font-weight: bold;"
              >${rooms[0]?.name}</text>
              <text 
                x="${10 + roomWidth/2}" 
                y="70" 
                fill="#666666" 
                text-anchor="middle"
                style="font-size: 8px;"
              >${rooms[0]?.size}</text>

              <!-- Room 2 -->
              <rect 
                x="${10 + roomWidth + spacing}" 
                y="30" 
                width="${roomWidth}" 
                height="${roomHeight}" 
                fill="white" 
                stroke="black"
                stroke-width="1"
              />
              <text 
                x="${10 + roomWidth + spacing + roomWidth/2}" 
                y="55" 
                fill="black" 
                text-anchor="middle"
                style="font-size: 9px; font-weight: bold;"
              >${rooms[1]?.name}</text>
              <text 
                x="${10 + roomWidth + spacing + roomWidth/2}" 
                y="70" 
                fill="#666666" 
                text-anchor="middle"
                style="font-size: 8px;"
              >${rooms[1]?.size}</text>

              <!-- Room 3 -->
              <rect 
                x="${10 + (roomWidth + spacing) * 2}" 
                y="30" 
                width="${roomWidth}" 
                height="${roomHeight}" 
                fill="white" 
                stroke="black"
                stroke-width="1"
              />
              <text 
                x="${10 + (roomWidth + spacing) * 2 + roomWidth/2}" 
                y="55" 
                fill="black" 
                text-anchor="middle"
                style="font-size: 9px; font-weight: bold;"
              >${rooms[2]?.name}</text>
              <text 
                x="${10 + (roomWidth + spacing) * 2 + roomWidth/2}" 
                y="70" 
                fill="#666666" 
                text-anchor="middle"
                style="font-size: 8px;"
              >${rooms[2]?.size}</text>

              <!-- Room 4 -->
              <rect 
                x="${10 + (roomWidth + spacing) * 3}" 
                y="30" 
                width="${roomWidth}" 
                height="${roomHeight}" 
                fill="white" 
                stroke="black"
                stroke-width="1"
              />
              <text 
                x="${10 + (roomWidth + spacing) * 3 + roomWidth/2}" 
                y="55" 
                fill="black" 
                text-anchor="middle"
                style="font-size: 9px; font-weight: bold;"
              >${rooms[3]?.name}</text>
              <text 
                x="${10 + (roomWidth + spacing) * 3 + roomWidth/2}" 
                y="70" 
                fill="#666666" 
                text-anchor="middle"
                style="font-size: 8px;"
              >${rooms[3]?.size}</text>
            </svg>
          </div>
        </div>
      `;
    }

// Rest of the code remains the same...

    static get styles() {
      return css`
        :host {
          display: block;
        }
        .floor {
          padding: 8px;
        }
        .svg-container {
          width: 400px;
          margin: 0 auto;
          border: 1px solid blue;
          overflow: hidden;
        }
        h3 {
          margin: 0 0 8px 0;
        }
      `;
    }

    render() {
      if (!this._config || !this._config.building) {
        return html`<div>Invalid configuration</div>`;
      }

      const firstFloor = this._config.building[0];
      return html`
        <ha-card>
          <div class="card-content" style="padding: 16px;">
            ${this._renderFloor(firstFloor)}
          </div>
        </ha-card>
      `;
    }
  });
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-floorplan-card",
  name: "Home Assistant Floorplan Card",
  description: "A card that displays a customizable floorplan with device tracking",
});
