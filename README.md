# net-viz-card
a network visualization card for Home Assistant


The card can only be edited in the code editor, not the UI editor.


```
type: custom:network-visualization-card
entity: device_tracker.josh_pixel_watch_bermuda_tracker
entity_name: Me or My Watch
header:
  show_title: true
  title: Network Visualization Card
  show_subtitle: true
  subtitle: Pixel Watch
map:  
  nodes:
    - name: Breezeway
      sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy1
    - name: Basement
      sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy2
    - name: Upstairs
      sensor_distance: sensor.josh_pixel_watch_distance_to_bleclient1
    - name: Living Room
      sensor_distance: sensor.josh_pixel_watch_distance_to_trainble
    - name: The Hole
      sensor_distance: sensor.josh_pixel_watch_distance_to_hci0_e4_5f_01_ae_c1_e4
footer:
  show_info_entities: true
  info_entities:
    - entity: sensor.josh_pixel_watch_area
      name: Area
    - entity: sensor.josh_pixel_watch_distance
      name: Distance

```

