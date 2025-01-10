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
    // Ensure the config object is extensible
    config = { ...config };

    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    if (!config.map || !config.map.nodes) {
      throw new Error('Please define map.nodes');
    }

    // Ensure default_zoom is provided in the header
    if (!config.header) {
      config.header = {};
    }
    if (config.header.default_zoom === undefined) {
      config.header.default_zoom = 100;
    }

    this._config = config;
    this.error = null; // Reset error state

    try {
      // Default header values if header is not defined
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

      // Default footer values if footer is not defined
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
          { name: "Node 2", sensor_distance: "sensor.node_2_distance" },
        ]
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
        font-size: 14px;
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
        justify-content: space-between;
        align-items: center;
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

    // Clear previous content
    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }

    // Create the card content
    const cardContent = document.createElement('div');
    cardContent.style.width = "100%";
    cardContent.style.height = "100%";
    root.appendChild(cardContent);

    // Dynamically size the SVG container to fill the card
    const svg = d3.select(cardContent).append('svg')
      .attr('viewBox', '0 0 900 600')
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block');

    const g = svg.append('g')
      .attr('transform', d3.zoomIdentity
        .translate(this._zoomState.x, this._zoomState.y)
        .scale(this._zoomState.k));

    // Apply the initial zoom from the header or the stored zoom state
    const initialZoom = d3.zoomIdentity
      .translate(this._zoomState.x, this._zoomState.y)
      .scale(this._zoomState.k !== 1 ? this._zoomState.k : (this._config.header?.default_zoom || 100) / 100);

    this._zoomState.k = this._zoomState.k !== 1 ? this._zoomState.k : (this._config.header?.default_zoom || 100) / 100;

    // Apply the zoom behavior to the SVG
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        // Store the new zoom state
        this._zoomState = {
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k
        };
        g.attr("transform", event.transform);
        this.requestUpdate(); // Request update to refresh zoom display
      });

    svg.call(zoom);

    // Initialize with stored zoom state or default zoom
    svg.call(zoom.transform, initialZoom);

    // Fetch the tracked device data
    const trackedDeviceEntity = this.hass.states[config.entity];
    if (!trackedDeviceEntity) {
      cardContent.innerHTML = 'Error: Tracked device not found.';
      return;
    }

    const trackedDevice = {
      name: config.entity_name || trackedDeviceEntity.attributes.friendly_name || config.entity,
      distance: 0
    };

    // Fetch the node data and render visualization
    const nodes = config.map.nodes.map(nodeConfig => {
      const stateObj = this.hass.states[nodeConfig.sensor_distance];
      return {
        name: nodeConfig.name || stateObj?.attributes.friendly_name || nodeConfig.sensor_distance,
        distance: stateObj && !isNaN(parseFloat(stateObj.state)) && stateObj.state !== 'unknown' ? parseFloat(stateObj.state) : null
      };
    });

    const width = 900;
    const height = 600;
    const minDistance = 60;
    const maxSVGDistance = Math.min(width, height) / 2 - minDistance;
    const invalidDistance = maxSVGDistance * 0.65;

    const colorScale = d3.scaleThreshold()
      .domain([3, 15, 50, 100])
      .range(["lightgreen", "yellow", "orange", "red", "grey"]);

    // Calculate node positions based on angles
    const angleStep = 360 / nodes.length;

    // Calculate positions for all nodes, including the tracked device
    const allNodes = [trackedDevice, ...nodes];
    allNodes.forEach((node, i) => {
      const angle = angleStep * i;
      const radians = (Math.PI / 180) * angle;
      const effectiveDistance = node.distance !== null 
        ? Math.max((node.distance / maxSVGDistance) * maxSVGDistance, minDistance) 
        : invalidDistance;
      node.x = effectiveDistance * Math.cos(radians);
      node.y = effectiveDistance * Math.sin(radians);
    });

    // Calculate bounding box
    const xExtent = d3.extent(allNodes, node => node.x);
    const yExtent = d3.extent(allNodes, node => node.y);
    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;

    // Adjust positions to center the visualization
    allNodes.forEach(node => {
      node.x += width / 2 - centerX;
      node.y += height / 2 - centerY;
    });

    // Draw the tracked device at the center
    g.append("circle")
      .attr("cx", width / 2)
      .attr("cy", height / 2)
      .attr("r", 10)
      .attr("fill", "blue");

    // Draw node circles and lines
    allNodes.forEach((node, i) => {
      if (i === 0) return; // Skip the tracked device itself

      if (node.distance !== null) {
        g.append("line")
          .attr("x1", width / 2)
          .attr("y1", height / 2)
          .attr("x2", node.x)
          .attr("y2", node.y)
          .attr("stroke", "grey")
          .attr("stroke-width", 2);

        g.append("text")
          .attr("x", (width / 2 + node.x) / 2)
          .attr("y", (height / 2 + node.y) / 2 - 10)
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text(`${node.distance}ft`)
          .raise();
      }

      g.append("circle")
        .attr("cx", node.x)
        .attr("cy", node.y)
        .attr("r", 10)
        .attr("fill", node.distance !== null ? colorScale(node.distance) : "lightgrey");

      g.append("text")
        .attr("x", node.x)
        .attr("y", node.y - 20)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .text(node.name)
        .raise();
    });
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
