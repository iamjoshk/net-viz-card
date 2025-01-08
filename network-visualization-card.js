import { LitElement, html } from 'https://unpkg.com/lit-element@2.5.1/lit-element.js?module';

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
  class NetworkVisualizationCard extends HTMLElement {
    constructor() {
      super();
      this.zoomTransform = d3.zoomIdentity; // Store zoom transform state
    }

    set hass(hass) {
      const config = this._config;
      const root = this.shadowRoot;

      if (!root) return;

      if (!this.content) {
        const card = document.createElement('ha-card');
        this.content = document.createElement('div');
        card.appendChild(this.content);
        root.appendChild(card);
      }

      // Clear previous content
      this.content.innerHTML = '';

      // Display title if show_title is true
      if (config.show_title) {
        const title = config.title || 'Network Visualization Card';
        const titleElement = document.createElement('h1');
        titleElement.style.margin = '16px';
        titleElement.style.fontSize = '24px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.textAlign = 'left';
        titleElement.textContent = title;
        this.content.appendChild(titleElement);
      }

      // Fetch the tracked device data
      const trackedDeviceEntity = hass.states[config.entity];
      if (!trackedDeviceEntity) {
        this.content.innerHTML = 'Error: Tracked device not found.';
        return;
      }

      // Display entity name if show_name is true
      if (config.show_name) {
        const entityName = config.name || trackedDeviceEntity.attributes.friendly_name || config.entity;
        const nameElement = document.createElement('h2');
        nameElement.style.margin = '8px 16px';
        nameElement.style.fontSize = '20px';
        nameElement.style.fontWeight = 'normal';
        nameElement.style.textAlign = 'left';
        nameElement.textContent = entityName;
        this.content.appendChild(nameElement);
      }

      // Display zoom level if show_zoom is true
      const zoomIndicator = document.createElement('div');
      zoomIndicator.style.position = 'absolute';
      zoomIndicator.style.top = '10px';
      zoomIndicator.style.right = '10px';
      zoomIndicator.style.backgroundColor = 'white';
      zoomIndicator.style.padding = '5px';
      zoomIndicator.style.border = '1px solid black';
      zoomIndicator.style.borderRadius = '3px';
      zoomIndicator.style.display = 'none';
      this.content.appendChild(zoomIndicator);

      if (config.show_zoom) {
        zoomIndicator.style.display = 'block';
      }

      const trackedDevice = {
        name: trackedDeviceEntity.attributes.friendly_name || config.entity,
        distance: 0
      };

      // Fetch the node data
      const nodes = config.nodes.map(nodeConfig => {
        const stateObj = hass.states[nodeConfig.sensor_distance];
        if (!stateObj || isNaN(parseFloat(stateObj.state)) || stateObj.state === 'unknown') {
          return null;
        }
        return {
          name: nodeConfig.name || stateObj.attributes.friendly_name,
          distance: parseFloat(stateObj.state)
        };
      }).filter(node => node !== null);

      // Check if nodes are properly fetched
      if (!nodes.length) {
        this.content.innerHTML = 'No valid nodes found.';
        return;
      }

      const maxDistance = Math.max(...nodes.map(node => node.distance));

      // Dynamically size the SVG container to fill the card
      const svg = d3.select(this.content).append('svg')
        .attr('viewBox', '0 0 900 600')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .style('width', '100%')
        .style('height', '100%')
        .style('border', '1px solid black'); // Add a border around the SVG

      const g = svg.append("g");

      // Define the zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.5, 5]) // Adjust scale extent as needed
        .on("zoom", (event) => {
          this.zoomTransform = event.transform;
          g.attr("transform", this.zoomTransform);
          zoomIndicator.textContent = `Zoom: ${(this.zoomTransform.k * 100).toFixed(0)}%`;
        });

      // Apply the zoom behavior to the SVG
      svg.call(zoom);

      const width = 900;
      const height = 600;
      const centerX = width / 2;
      const centerY = height / 2;
      const initialTransform = d3.zoomIdentity.translate(centerX, centerY);
      svg.call(zoom.transform, initialTransform);

      const minDistance = 60; // Increased minimum distance for better readability
      const maxSVGDistance = Math.min(width, height) / 2 - minDistance;

      const colorScale = d3.scaleThreshold()
        .domain([3, 15, 50, 100])
        .range(["lightgreen", "yellow", "orange", "red", "grey"]);

      g.append("circle")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", 10) // Reduced radius for node circles
        .attr("fill", "lightblue");

      const angleStep = 360 / nodes.length;

      nodes.forEach((node, i) => {
        const angle = angleStep * i;
        const radians = (Math.PI / 180) * angle;
        const effectiveDistance = Math.max((node.distance / maxDistance) * maxSVGDistance, minDistance);
        node.x = centerX + effectiveDistance * Math.cos(radians);
        node.y = centerY + effectiveDistance * Math.sin(radians);

        g.append("line")
          .attr("x1", centerX)
          .attr("y1", centerY)
          .attr("x2", node.x)
          .attr("y2", node.y)
          .attr("stroke", "grey")
          .attr("stroke-width", 2);

        g.append("circle")
          .attr("cx", node.x)
          .attr("cy", node.y)
          .attr("r", 10) // Reduced radius for node circles
          .attr("fill", colorScale(node.distance));

        // Ensure text and distances are the top layer
        g.append("text")
          .attr("x", (centerX + node.x) / 2)
          .attr("y", (centerY + node.y) / 2 - 10)
          .attr("font-size", "14px") // Adjusted font size for readability
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text(`${node.distance}ft`)
          .raise();

        g.append("text")
          .attr("x", node.x)
          .attr("y", node.y - 20) // Adjusted position for readability
          .attr("font-size", "14px") // Adjusted font size for readability
          .attr("fill", "black")
          .attr("text-anchor", "middle")
          .text(node.name)
          .raise();
      });

      const closestScanner = nodes.reduce((prev, curr) => curr.distance < prev.distance ? curr : prev, nodes[0]);

      function animatePulsingCircle() {
        g.select(".pulsing-circle")
          .attr("r", 0)
          .transition()
          .duration(2000)
          .attr("r", closestScanner.distance * 2)
          .ease(d3.easeLinear)
          .on("end", animatePulsingCircle);
      }

      animatePulsingCircle();
    }

    setConfig(config) {
      this._config = config;
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }
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

    getCardSize() {
      return Math.ceil(600 / 50); // Adjust this value based on your desired row height
    }
  }

  customElements.define('network-visualization-card', NetworkVisualizationCard);
}
