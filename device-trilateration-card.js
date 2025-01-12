// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "network-visualization-card",
  name: "Network Visualization Card",
  description: "A card that visualizes network nodes and their distances",
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

class NetworkVisualizationCard extends LitElement {
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
        show_bounding_box: true
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
      .zoom-level {
        padding: 4px 8px;
        font-size: 10pt;
        color: var(--secondary-text-color);
      }
      .card-header h2, .card-header h3 {
        margin: 0;
        padding: 2px;
        line-height: var(--paper-font-title_-_line-height);
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
        border-top: 1px solid var(--divider-color, #e8e8e8);
      }
      .info-entity {
        margin: 4px 0;
        display: flex;
        align-items: center;
        text-align: left;
      }
      .info-entity strong {
        margin-right: 8px;
      }
      .error-message {
        color: red;
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
              <div class="zoom-level">
                Zoom: ${Math.round(this._zoomState.k * 100)}%
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
                return html`<div class="info-entity">
                  Error: ${entityConfig.entity} not found
                </div>`;
              }
              return html`
                <div class="info-entity">
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

  _renderCard() {
    if (!window.d3 || !this._config) return;
    
    const config = this._config;
    const root = this.shadowRoot.getElementById('content');
    if (!root) return;

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

    this._zoomState.k = this._zoomState.k !== 1 ? this._config.header?.default_zoom || 100 / 100 : this._zoomState.k;

    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        this._zoomState = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        };
        g.attr("transform", event.transform);
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
        distance: stateObj && !isNaN(parseFloat(stateObj.state)) && stateObj.state !== 'unknown' ? parseFloat(stateObj.state) : null,
        x: (index % cols) * nodeWidth + nodeWidth / 2,
        y: Math.floor(index / cols) * nodeHeight + nodeHeight / 2
      };
    });

    const circleRadius = 7.5; // 25% smaller than original 10

    nodes.forEach((node) => {
      g.append("circle")
        .attr("cx", node.x)
        .attr("cy", node.y)
        .attr("r", circleRadius)
        .attr("fill", "lightgrey");

      g.append("text")
        .attr("x", node.x)
        .attr("y", node.y - 15)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(node.name)
        .raise();

      g.append("text")
        .attr("x", node.x)
        .attr("y", node.y - 5)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(`${node.distance !== null ? `${node.distance}ft` : 'unknown'}`)
        .raise();
    });

    const closestNodes = nodes.filter(node => node.distance !== null)
                              .sort((a, b) => a.distance - b.distance)
                              .slice(0, 3);

    // Start of trilateration logic
    if (closestNodes.length === 3) {
      const [node1, node2, node3] = closestNodes;
      
      const A = 2 * (node2.x - node1.x);
      const B = 2 * (node2.y - node1.y);
      const C = 2 * (node3.x - node1.x);
      const D = 2 * (node3.y - node1.y);
      
      const E = node1.distance ** 2 - node2.distance ** 2 - node1.x ** 2 + node2.x ** 2 - node1.y ** 2 + node2.y ** 2;
      const F = node1.distance ** 2 - node3.distance ** 2 - node1.x ** 2 + node3.x ** 2 - node1.y ** 2 + node3.y ** 2;
      
      const x = (E * D - B * F) / (A * D - B * C);
      const y = (A * F - E * C) / (A * D - B * C);

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", circleRadius)
        .attr("fill", "blue");

      g.append("text")
        .attr("x", x)
        .attr("y", y + 15)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(trackedDevice.name)
        .raise();
    } else if (closestNodes.length === 2) {
      const [node1, node2] = closestNodes;
      const totalDistance = node1.distance + node2.distance;
      const x = (node1.x * node1.distance + node2.x * node2.distance) / totalDistance;
      const y = (node1.y * node1.distance + node2.y * node2.distance) / totalDistance;

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", circleRadius)
        .attr("fill", "blue");

      g.append("text")
        .attr("x", x)
        .attr("y", y + 15)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(trackedDevice.name)
        .raise();
    } else if (closestNodes.length === 1) {
      const [node1] = closestNodes;
      const x = node1.x + circleRadius * 2;
      const y = node1.y;

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", circleRadius)
        .attr("fill", "blue");

      g.append("text")
        .attr("x", x)
        .attr("y", y + 15)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text(trackedDevice.name)
        .raise();
    } else {
      g.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("fill", "red")
        .attr("text-anchor", "middle")
        .style("font-size", "10pt")
        .text('No valid distances found')
        .raise();
    }
    // End of trilateration logic
  }
}

// Only define the custom element once d3 is loaded
const defineCustomElement = () => {
  if (d3Loaded) {
    customElements.define('network-visualization-card', NetworkVisualizationCard);
  } else {
    setTimeout(defineCustomElement, 100);
  }
};

defineCustomElement();
