// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "device-trilateration-card",
  name: "Device Trilateration Card",
  description: "A card that visualizes network nodes and their distances using trilateration",
  preview: true
});

import { LitElement, html, css } from 'https://unpkg.com/lit-element@2.5.1/lit-element.js?module';

// Make sure D3.js is loaded before the card is defined
let d3Loaded = false;
const loadD3 = async () => {
  if (!window.d3) {
    await new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.async = true;
      script.onload = () => {
        d3Loaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  } else {
    d3Loaded = true;
  }
};

loadD3();

class DeviceTrilaterationCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _zoomState: { type: Object, attribute: false },
    };
  }

  constructor() {
    super();
    this._zoomState = {
      x: 0,
      y: 0,
      k: 1
    };
    this.error = null;
  }

  setConfig(config) {
    config = { ...config };

    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    if (!config.map || !config.map.nodes) {
      throw new Error('Please define map.nodes');
    }

    if (config.map.map_size === undefined) {
      config.map.map_size = "3 3";
    }

    if (config.map.show_all_nodes === undefined) {
      config.map.show_all_nodes = true;
    }
    if (config.map.show_bounding_box === undefined) {
      config.map.show_bounding_box = true;
    }
    if (config.map.show_trilateration === undefined) {
      config.map.show_trilateration = true;
    }

    if (!config.header) {
      config.header = {};
    }
    if (config.header.default_zoom === undefined) {
      config.header.default_zoom = 100;
    }

    this._config = config;
    this.error = null;

    try {
      if (!this._config.header) {
        this._config.header = {
          show_title: false,
          show_subtitle: false
        };
      } else {
        if (this._config.header.show_title && !this._config.header.title) {
          throw new Error('Title is required when show_title is true.');
        }
        if (this._config.header.show_subtitle && !this._config.header.subtitle) {
          throw new Error('Subtitle is required when show_subtitle is true.');
        }
      }

      if (!this._config.footer) {
        this._config.footer = {
          show_info_entities: false
        };
      } else {
        if (this._config.footer.show_info_entities && (!this._config.footer.info_entities || this._config.footer.info_entities.length === 0)) {
          throw new Error('At least one info_entity is required when show_info_entities is true.');
        }
      }
    } catch (error) {
      this.error = error.message;
    }
  }

  static getStubConfig() {
    return {
      entity: "sensor.tracked_device",
      entity_name: "Tracked Device",
      map: {
        nodes: [
          { name: "Node 1", sensor_distance: "sensor.node_1_distance" },
          { name: "Node 2", sensor_distance: "sensor.node_2_distance" }
        ],
        map_size: "3 3",
        show_all_nodes: true,
        show_bounding_box: true,
        show_trilateration: true
      },
      header: {
        show_title: true,
        title: "Network Visualization",
        show_subtitle: false,
        show_zoom: true,
        default_zoom: 100
      },
      footer: {
        show_info_entities: true,
        info_entities: [
          { name: "Node 1 Distance", entity: "sensor.node_1_distance" },
          { name: "Node 2 Distance", entity: "sensor.node_2_distance" }
        ]
      }
    };
  }

// End of Part 1

static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--ha-card-background, var(--card-background-color, white));
        color: var(--primary-text-color);
      }
      .card-header {
        padding: 2px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header-text {
        flex: 1;
      }
      .zoom-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;  // Reduced from 4px
            }
            .zoom-controls {
              display: flex;
              align-items: center;
              gap: 4px;  // Reduced from 8px
            }
      .zoom-level {
        padding: 4px 8px;
        font-size: 10pt;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .zoom-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .zoom-button {
        cursor: pointer;
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        background: var(--primary-color);
        color: var(--text-primary-color);
        font-size: 14px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
      }
      .zoom-button:hover {
        background: var(--primary-color-light, var(--primary-color));
      }
      .card-header h2, .card-header h3 {
        margin: 0;
        padding: 2px;
        line-height: var(--paper-font-title_-_line-height);
        color: var(--primary-text-color);
      }
      .card-header h2 {
        font-size: var(--ha-card-header-font-size, 24px);
      }
      .card-header h3 {
        font-size: var(--ha-card-subheader-font-size, 16px);
      }
      #content {
        flex: 1;
        position: relative;
        width: 100%;
        height: 100%;
      }
      svg {
        width: 100%;
        height: 100%;
      }
      .card-footer {
        padding: 8px;
        border-top: 1px solid var(--divider-color);
        background: var(--ha-card-background, var(--card-background-color, white));
      }
      .info-entity {
        margin: 4px 0;
        display: flex;
        align-items: center;
        text-align: left;
        color: var(--primary-text-color);
      }
      .info-entity strong {
        margin-right: 8px;
      }
      .error-message {
        color: var(--error-color, red);
        padding: 16px;
      }
    `;
  }

  render() {
    if (this.error) {
      return html`
        <ha-card>
          <div class="error-message">${this.error}</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        ${this._config.header?.show_title ? html`
          <div class="card-header">
            <div class="header-text">
              ${this._config.header.title ? html`<h2>${this._config.header.title}</h2>` : ''}
              ${this._config.header.show_subtitle && this._config.header.subtitle ? 
                html`<h3>${this._config.header.subtitle}</h3>` : ''}
            </div>
            ${this._config.header.show_zoom ? html`
              <div class="zoom-container">
                <div class="zoom-level">
                  Zoom: ${Math.round(this._zoomState.k * 100)}%
                </div>
                <div class="zoom-controls">
                  <button class="zoom-button" @click="${this._handleZoomOut}" title="Zoom Out">-</button>
                  <button class="zoom-button" @click="${this._handleZoomIn}" title="Zoom In">+</button>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
        <div id="content"></div>
        ${this._config.footer?.show_info_entities ? html`
          <div class="card-footer">
            ${this._config.footer.info_entities.map(entityConfig => {
              const stateObj = this.hass.states[entityConfig.entity];
              if (!stateObj) {
                return html`<div class="info-entity" @click="${() => this._showMoreInfo(entityConfig.entity)}">
                  Error: ${entityConfig.entity} not found
                </div>`;
              }
              return html`
                <div class="info-entity" @click="${() => this._showMoreInfo(entityConfig.entity)}">
                  <strong>${entityConfig.name || stateObj.attributes.friendly_name || entityConfig.entity}:</strong>
                  ${stateObj.state}${stateObj.attributes.unit_of_measurement ? ` ${stateObj.attributes.unit_of_measurement}` : ''}
                </div>
              `;
            })}
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  updated(changedProps) {
    if (!d3Loaded) {
      setTimeout(() => this.requestUpdate(), 100);
      return;
    }
    
    if (changedProps.has('hass') || changedProps.has('_config')) {
      this._renderCard();
    }
  }

// End of Part 2
  _handleZoomIn() {
    const newScale = Math.min(this._zoomState.k * 1.2, 5);
    this._updateZoom(newScale);
  }

  _handleZoomOut() {
    const newScale = Math.max(this._zoomState.k / 1.2, 0.5);
    this._updateZoom(newScale);
  }

  _updateZoom(newScale) {
    const svg = this.shadowRoot.querySelector('svg');
    if (!svg) return;

    const g = d3.select(svg).select('g');
    
    this._zoomState = {
      x: this._zoomState.x,
      y: this._zoomState.y,
      k: newScale
    };

    g.attr('transform', `translate(${this._zoomState.x}, ${this._zoomState.y}) scale(${newScale})`);
    this.requestUpdate();
  }

  _renderCard() {
    if (!window.d3 || !this._config) return;
    
    const config = this._config;
    const root = this.shadowRoot.getElementById('content');
    if (!root) return;

    // Get the computed text color for dark mode compatibility
    const computedStyle = getComputedStyle(this);
    const textColor = computedStyle.getPropertyValue('--primary-text-color').trim();
    const nodeColor = computedStyle.getPropertyValue('--secondary-text-color').trim();

    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    const cardContent = document.createElement('div');
    cardContent.style.width = "100%";
    cardContent.style.height = "100%";
    root.appendChild(cardContent);

    const svg = d3.select(cardContent).append('svg')
      .attr('viewBox', '0 0 400 400')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block');

    const g = svg.append('g')
      .attr('transform', d3.zoomIdentity
        .translate(this._zoomState.x, this._zoomState.y)
        .scale(this._zoomState.k));

    const initialZoom = d3.zoomIdentity
      .translate(this._zoomState.x, this._zoomState.y)
      .scale(this._zoomState.k !== 1 ? this._zoomState.k : (this._config.header?.default_zoom || 100) / 100);

    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .filter(event => {
        return !event.type.includes('wheel') && !event.type.includes('pinch');
      })
      .on("zoom", (event) => {
        this._zoomState = {
          x: event.transform.x,
          y: event.transform.y,
          k: this._zoomState.k
        };
        g.attr("transform", `translate(${event.transform.x}, ${event.transform.y}) scale(${this._zoomState.k})`);
        this.requestUpdate();
      });

    svg.call(zoom);
    svg.call(zoom.transform, initialZoom);

    const trackedDeviceEntity = this.hass.states[config.entity];
    if (!trackedDeviceEntity) {
      cardContent.innerHTML = 'Error: Tracked device not found.';
      return;
    }

    const trackedDevice = {
      name: config.entity_name || trackedDeviceEntity.attributes.friendly_name || config.entity,
      distance: 0
    };

    const width = 400;
    const height = 400;

    const [cols, rows] = config.map.map_size.split(' ').map(Number);
    const nodeWidth = width / cols;
    const nodeHeight = height / rows;

    const nodes = config.map.nodes.map((nodeConfig, index) => {
      const stateObj = this.hass.states[nodeConfig.sensor_distance];
      return {
        name: nodeConfig.name || stateObj?.attributes.friendly_name || nodeConfig.sensor_distance,
        distance: stateObj && !isNaN(parseFloat(stateObj.state)) && stateObj.state !== 'unknown' && stateObj.state !== 'unavailable' ? parseFloat(stateObj.state) : null,
        x: (index % cols) * nodeWidth + nodeWidth / 2,
        y: Math.floor(index / cols) * nodeHeight + nodeHeight / 2,
        sensor_distance: nodeConfig.sensor_distance
      };
    });

    const circleRadius = 7.5;

    if (config.map.show_bounding_box) {
      g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("stroke", "var(--divider-color)")
        .attr("stroke-width", "1");
    }

    const visibleNodes = config.map.show_all_nodes ?
      nodes :
      nodes.filter(node => node.distance !== null);

    visibleNodes.forEach((node) => {
      g.append("circle")
        .attr("cx", node.x)
        .attr("cy", node.y)
        .attr("r", circleRadius)
        .attr("fill", nodeColor)
        .style("cursor", "pointer")
        .on("click", () => {
          if (node.sensor_distance) {
            this._showMoreInfo(node.sensor_distance);
          }
        });

      g.append("text")
        .attr("x", node.x)
        .attr("y", node.y - 22)
        .attr("fill", textColor)
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(node.name)
        .raise();

      g.append("text")
        .attr("x", node.x)
        .attr("y", node.y - 35)
        .attr("fill", textColor)
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(`${node.distance !== null ? `${node.distance}ft` : 'unknown'}`)
        .raise();
    });

    const closestNodes = visibleNodes.filter(node => node.distance !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    if (closestNodes.length === 3) {
        const [node1, node2, node3] = closestNodes;
        const weight1 = 1 / node1.distance;
        const weight2 = 1 / node2.distance;
        const weight3 = 1 / node3.distance;
        const totalWeight = weight1 + weight2 + weight3;
        const w1 = weight1 / totalWeight;
        const w2 = weight2 / totalWeight;
        const w3 = weight3 / totalWeight;
        const x = (node1.x * w1) + (node2.x * w2) + (node3.x * w3);
        const y = (node1.y * w1) + (node2.y * w2) + (node3.y * w3);

        if (config.map.show_trilateration) {
            g.append("polygon")
                .attr("points", `${node1.x},${node1.y} ${node2.x},${node2.y} ${node3.x},${node3.y}`)
                .attr("fill", "none")
                .attr("stroke", "var(--success-color)")
                .attr("stroke-width", "1");
        }

        g.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", circleRadius)
            .attr("fill", "var(--primary-color)")
            .style("cursor", "pointer")
            .on("click", () => this._showMoreInfo(config.entity));

        g.append("text")
            .attr("x", x)
            .attr("y", y + 25)
            .attr("fill", textColor)
            .attr("text-anchor", "middle")
            .style("font-size", "10pt")
            .text(trackedDevice.name)
            .raise();

    } else if (closestNodes.length === 2) {
        const [node1, node2] = closestNodes;
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const ratio = node1.distance / (node1.distance + node2.distance);
        const x = node1.x + dx * ratio;
        const y = node1.y + dy * ratio;

        g.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", circleRadius)
            .attr("fill", "var(--primary-color)")
            .style("cursor", "pointer")
            .on("click", () => this._showMoreInfo(config.entity));

        g.append("text")
            .attr("x", x)
            .attr("y", y + 25)
            .attr("fill", textColor)
            .attr("text-anchor", "middle")
            .style("font-size", "10pt")
            .text(trackedDevice.name)
            .raise();

    } else if (closestNodes.length === 1) {
        const [node1] = closestNodes;
        const x = node1.x + node1.distance;
        const y = node1.y;

        g.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", circleRadius)
            .attr("fill", "var(--primary-color)")
            .style("cursor", "pointer")
            .on("click", () => this._showMoreInfo(config.entity));

        g.append("text")
            .attr("x", x)
            .attr("y", y + 25)
            .attr("fill", textColor)
            .attr("text-anchor", "middle")
            .style("font-size", "10pt")
            .text(trackedDevice.name)
            .raise();
    } else {
        g.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("fill", textColor)
            .attr("text-anchor", "middle")
            .style("font-size", "10pt")
            .text('No valid distances found')
            .raise();
    }
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId }
    });
    this.dispatchEvent(event);
  }
}

customElements.define('device-trilateration-card', DeviceTrilaterationCard);
