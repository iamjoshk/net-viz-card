import { LitElement, html, css } from 'https://unpkg.com/lit-element@2.5.1/lit-element.js?module';

// Load D3.js library
if (!window.d3) {
  const script = document.createElement('script');
  script.src = 'https://d3js.org/d3.v7.min.js';
  script.async = true;
  document.head.appendChild(script);

  script.onload = () => {
    initializeCard();
  };
} else {
  initializeCard();
}

function initializeCard() {
  class NetworkVisualizationCard extends LitElement {
    static get properties() {
      return {
        hass: { type: Object },
        _config: { type: Object },
        zoomTransform: { type: Object },
      };
    }

    constructor() {
      super();
      this.zoomTransform = d3.zoomIdentity; // Initialize zoomTransform to the default identity
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
      `;
    }

    static getStubConfig() {
      return {
        entity: "sensor.tracked_device",
        nodes: [
          { name: "Node 1", sensor_distance: "sensor.node_1_distance" },
          { name: "Node 2", sensor_distance: "sensor.node_2_distance" },
        ],
      };
    }

    setConfig(config) {
      this._config = config;
    }

    getCardSize() {
      return 3; // Adjust this value based on your desired card size in rows
    }

    render() {
      return html`
        <ha-card>
          <div id="content"></div>
        </ha-card>
      `;
    }

    updated(changedProps) {
      if (changedProps.has('hass') || changedProps.has('_config')) {
        this._renderCard();
      }
    }

    _renderCard() {
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

      // Add header and subtitle elements
      if (config.show_title) {
        const titleElement = document.createElement('h1');
        titleElement.style.margin = '16px';
        titleElement.style.fontSize = '24px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.textAlign = 'left';
        titleElement.textContent = config.title || 'Network Visualization Card';
        cardContent.appendChild(titleElement);
      }

      if (config.show_subtitle) {
        const subtitleElement = document.createElement('h2');
        subtitleElement.style.margin = '8px 16px';
        subtitleElement.style.fontSize = '20px';
        subtitleElement.style.fontWeight = 'normal';
        subtitleElement.style.textAlign = 'left';
        const trackedDeviceEntity = this.hass.states[config.entity];
        const entityName = config.entity_name || trackedDeviceEntity.attributes.friendly_name || config.entity;
        subtitleElement.textContent = config.subtitle || entityName;
        cardContent.appendChild(subtitleElement);
      }

      // Dynamically size the SVG container to fill the card
      const svg = d3.select(cardContent).append('svg')
        .attr('viewBox', '0 0 900 600')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', '100%')
        .style('display', 'block'); // Ensures the SVG doesn't overflow the container

      const g = svg.append('g');

      // Apply the zoom behavior to the SVG
      const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
          this.zoomTransform = event.transform; // Store the current zoom transform
          g.attr("transform", this.zoomTransform);
        });
      svg.call(zoom);

      // Reapply the stored zoom transform
      svg.call(zoom.transform, this.zoomTransform);

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

      // Fetch the node data
      const nodes = config.nodes.map(nodeConfig => {
        const stateObj = this.hass.states[nodeConfig.sensor_distance];
        return {
          name: nodeConfig.name || stateObj?.attributes.friendly_name || nodeConfig.sensor_distance,
          distance: stateObj && !isNaN(parseFloat(stateObj.state)) && stateObj.state !== 'unknown' ? parseFloat(stateObj.state) : null
        };
      });

      const width = 900;
      const height = 600;
      const minDistance = 60; // Minimum distance for readability
      const maxSVGDistance = Math.min(width, height) / 2 - minDistance;
      const invalidDistance = maxSVGDistance * 0.65; // 35% closer than the maximum distance

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
        .attr("r", 10) // Radius for the tracked device circle
        .attr("fill", "blue");

      // Draw node circles and lines
      allNodes.forEach((node, i) => {
        if (i === 0) return; // Skip the tracked device itself

        // Draw lines from the tracked device to each node if distance is valid
        if (node.distance !== null) {
          g.append("line")
            .attr("x1", width / 2)
            .attr("y1", height / 2)
            .attr("x2", node.x)
            .attr("y2", node.y)
            .attr("stroke", "grey")
            .attr("stroke-width", 2);

          // Add distance text
          g.append("text")
            .attr("x", (width / 2 + node.x) / 2)
            .attr("y", (height / 2 + node.y) / 2 - 10)
            .attr("font-size", "14px") // Adjusted font size for readability
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .text(`${node.distance}ft`)
            .raise();
        }

        // Draw node circles
        g.append("circle")
          .attr("cx", node.x)
          .attr("cy", node.y)
          .attr("r", 10) // Adjusted radius for node circles
          .attr("fill", node.distance !== null ? colorScale(node.distance) : "lightgrey");

        // Draw node names
        g.append("text")
          .attr("x", node.x)
          .attr("y", node.y - 20) // Adjusted position for readability
          .attr("font-size", "14px") // Adjusted font size for readability
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text(node.name)
          .raise();
      });
    }
  }

  customElements.define('network-visualization-card', NetworkVisualizationCard);
}
