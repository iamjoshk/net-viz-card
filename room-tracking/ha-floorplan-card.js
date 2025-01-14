import { LitElement, html, css, svg } from "https://unpkg.com/lit-element@2.5.1/lit-element.js?module";

class FloorplanCard extends LitElement {
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

  _shouldDrawBorder(grid, rowIndex, colIndex, side) {
    const currentId = grid[rowIndex][colIndex];
    
    switch(side) {
      case 'top':
        return rowIndex === 0 || grid[rowIndex - 1][colIndex] !== currentId;
      case 'right':
        return colIndex === grid[rowIndex].length - 1 || grid[rowIndex][colIndex + 1] !== currentId;
      case 'bottom':
        return rowIndex === grid.length - 1 || grid[rowIndex + 1][colIndex] !== currentId;
      case 'left':
        return colIndex === 0 || grid[rowIndex][colIndex - 1] !== currentId;
      default:
        return true;
    }
  }

  _findConnectedRooms(grid, roomId, rowIndex, colIndex, visited = new Set()) {
    const key = `${rowIndex},${colIndex}`;
    if (visited.has(key)) return [];
    
    visited.add(key);
    const connected = [{rowIndex, colIndex}];
    
    // Check adjacent cells
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
    ];
    
    for (const [dx, dy] of directions) {
      const newRow = rowIndex + dx;
      const newCol = colIndex + dy;
      
      if (newRow >= 0 && newRow < grid.length &&
          newCol >= 0 && newCol < grid[newRow].length &&
          grid[newRow][newCol] === roomId) {
        connected.push(...this._findConnectedRooms(grid, roomId, newRow, newCol, visited));
      }
    }
    
    return connected;
  }

  _findCenterOfConnectedRooms(connectedRooms, roomWidth, roomHeight, margin, spacing) {
    // Calculate the center point of all connected rooms
    const minX = Math.min(...connectedRooms.map(({colIndex}) => margin + colIndex * (roomWidth + spacing)));
    const maxX = Math.max(...connectedRooms.map(({colIndex}) => margin + colIndex * (roomWidth + spacing) + roomWidth));
    const minY = Math.min(...connectedRooms.map(({rowIndex}) => margin + rowIndex * (roomHeight + spacing)));
    const maxY = Math.max(...connectedRooms.map(({rowIndex}) => margin + rowIndex * (roomHeight + spacing) + roomHeight));
    
    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    };
  }

  _renderRoom(room, x, y, borders, showText) {
      const width = 65;
      const height = 45;
      
      let pathData = '';
      if (borders.top) pathData += `M ${x},${y} h ${width} `;
      if (borders.right) pathData += `M ${x + width},${y} v ${height} `;
      if (borders.bottom) pathData += `M ${x},${y + height} h ${width} `;
      if (borders.left) pathData += `M ${x},${y} v ${height} `;
      
      return svg`
        <rect 
          x="${x}" 
          y="${y}" 
          width="${width}" 
          height="${height}" 
          fill="white" 
        />
        ${pathData ? svg`<path d="${pathData}" stroke="black" stroke-width="1" fill="none"/>` : ''}
      `;
  }

  _renderFloor(floor) {
    const rows = floor.arrangement.map(row => 
      row.split('|')
         .map(cell => cell.trim())
         .filter(cell => cell.length > 0)
    );

    const roomWidth = 65;
    const roomHeight = 45;
    const spacing = 0;
    const margin = 10;

    const maxRoomsInRow = Math.max(...rows.map(row => row.length));
    const svgWidth = (roomWidth + spacing) * maxRoomsInRow + margin * 2;
    const svgHeight = (roomHeight + spacing) * rows.length + margin * 2;

    // Track which rooms we've already processed for text display
    const processedRooms = new Set();
    
    const roomElements = [];
    const textElements = [];

    // First pass: render all rooms
    rows.forEach((row, rowIndex) => {
      row.forEach((roomId, colIndex) => {
        const room = floor.rooms.find(r => r.id === roomId);
        if (!room) return;

        const x = margin + colIndex * (roomWidth + spacing);
        const y = margin + rowIndex * (roomHeight + spacing);
        
        const borders = {
          top: this._shouldDrawBorder(rows, rowIndex, colIndex, 'top'),
          right: this._shouldDrawBorder(rows, rowIndex, colIndex, 'right'),
          bottom: this._shouldDrawBorder(rows, rowIndex, colIndex, 'bottom'),
          left: this._shouldDrawBorder(rows, rowIndex, colIndex, 'left')
        };
        
        roomElements.push(this._renderRoom(room, x, y, borders, false));

        // Add text only once per connected group
        if (!processedRooms.has(roomId)) {
          const connectedRooms = this._findConnectedRooms(rows, roomId, rowIndex, colIndex);
          const center = this._findCenterOfConnectedRooms(connectedRooms, roomWidth, roomHeight, margin, spacing);
          
          textElements.push(svg`
            <text 
              x="${center.x}" 
              y="${center.y - 5}" 
              fill="black" 
              text-anchor="middle"
              font-size="9px"
              font-weight="bold"
            >${room.name}</text>
            <text 
              x="${center.x}" 
              y="${center.y + 7}" 
              fill="#666666" 
              text-anchor="middle"
              font-size="7px"
            >${room.size}</text>
          `);
          
          processedRooms.add(roomId);
        }
      });
    });

    return html`
      <div class="floor">
        <h3>${floor.floor_name} (Level ${floor.floor_level})</h3>
        <div class="svg-container">
          <svg 
            width="100%"
            height="100%"
            viewBox="0 0 ${svgWidth} ${svgHeight}"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect 
              x="0" 
              y="0" 
              width="${svgWidth}" 
              height="${svgHeight}" 
              fill="#f0f0f0"
            />
            ${roomElements}
            ${textElements}
          </svg>
        </div>
      </div>
    `;
  }

  render() {
    if (!this._config) {
      return html`<div>No configuration</div>`;
    }

    const firstFloor = this._config.building[0];
    return html`
      <ha-card>
        <div class="card-content">
          ${this._renderFloor(firstFloor)}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      .card-content {
        padding: 8px;
      }
      .floor {
        padding: 4px;
      }
      h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
      }
      .svg-container {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
      }
    `;
  }
}

if (!customElements.get('ha-floorplan-card')) {
  customElements.define('ha-floorplan-card', FloorplanCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-floorplan-card",
  name: "Home Assistant Floorplan Card",
  description: "A card that displays a customizable floorplan",
});
