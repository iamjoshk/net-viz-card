Beginnings of a network visualization card.


# net-viz-card
a network visualization card for Home Assistant

> The card can only be edited in the code editor, not the UI editor.

Created to help visualize a device being tracked by [Bermuda BLE Trilateration](https://github.com/agittins/bermuda) this card should conceivably create a star topology visualization of any device and node combination. It does not currently represent mesh networks.

### V0.01
Initial release

# V0.02
> The card can only be edited in the code editor, not the UI editor.

Updated with options to show/hide the current zoom, set a default zoom, show/hide the bounding box, and show/hide all nodes.

| Name | Type | Default | Options | Description |
|------|------|---------|---------|-------------|
| `type` | string | required | `custom:network-visualization-card` | card type |
| `entity` | string | required | any HA entity | represents a tracked device, will be center of visualization |
| `entity_name` | string | optional | any value | if blank or undeclared will default to entity's `friendly_name`|
| `header` | object | required | | required to be declared |
| `show_title`| boolean | optional | `true` or `false` | defaults to false if excluded |
| `title` | string | conditionally required | any value | required if `show_title` is true |
| `show_subtitle`| boolean | optional | `true` or `false` | defaults to false if excluded |
| `subtitle` | string | conditionally required | any value | required if `show_subtitle` is true |
| `show_zoom` | boolean | optional | `true` or `false` | show/hide the current zoom level of the map |
| `default_zoom` | number | optional | zoom level, default is `100` |
| `map` | object | required | | kinda the whole point of the card |
| `show_all_nodes` | boolean | optional | `true` or `false` | defaults to true, show/hide nodes with invalid distances |
| `show_bounding_box` | boolean | optional | `true` or `false` | defaults to true, show/hide the bounding box for the map |
| `nodes` | object | required | | mapping block |
| `sensor_distance` | string | required | any sensor with a numeric value for a state | use `-` for the mapping sequence |
| `name` | string | optional | any value | defaults to friendly name of sensor if excluded or left blank |
| `footer` | object | required | | required to be declared |
| `show_info_entities` | boolean | optional | `true` or `false` | defaults to false if excluded |
| `info_entities` | object | conditionally required | | required if `show_info_entities` is true |
| `entity` | string | required | any entity | will display any entity's state |
| `name` | string | optional | any value | if excluded or left blank, entity's friendly name will be displayed |
```
type: custom:network-visualization-card
entity: device_tracker.josh_pixel_watch_bermuda_tracker
entity_name: Me or My Watch
header:
  show_title: true
  title: Network Visualization Card
  show_subtitle: true
  subtitle: Pixel Watch
  show_zoom: true
  default_zoom: 100
map:
  show_all_nodes: true
  show_bounding_box: true  
  nodes:
    - sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy1
      name: Breezeway
    - sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy2
      name: Basement
    - sensor_distance: sensor.josh_pixel_watch_distance_to_bleclient1
      name: Upstairs
    - sensor_distance: sensor.josh_pixel_watch_distance_to_trainble
      name: Living Room
    - sensor_distance: sensor.josh_pixel_watch_distance_to_habt
      name: The Hole
footer:
  show_info_entities: true
  info_entities:
    - entity: sensor.josh_pixel_watch_area
      name: Area
    - entity: sensor.josh_pixel_watch_distance
      name: Distance

```
![image](https://github.com/user-attachments/assets/7d6bfc0e-f7f1-4832-9b9a-e21d0c6dfa62)


