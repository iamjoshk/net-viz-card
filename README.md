# net-viz-card
a network visualization card for Home Assistant


The card can only be edited in the code editor, not the UI editor:

```
type: custom:network-visualization-card
show_title: true #or false
title: My Visualization Card #optional, defaults to Network Visualization Card if not defined
entity: device_tracker.josh_pixel_watch_bermuda_tracker #required tracked device, router, etc
show_name: true #or false
name: Pixel Watch #optional, defaults to defined entity's friendly name
show_zoom: true #or false
nodes: #at least one node required
  - name: btproxy1
    sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy1
  - name: btproxy2
    sensor_distance: sensor.josh_pixel_watch_distance_to_btproxy2
  - name: bleclient1
    sensor_distance: sensor.josh_pixel_watch_distance_to_bleclient1
  - name: trainble
    sensor_distance: sensor.josh_pixel_watch_distance_to_trainble
  - name: HA BT
    sensor_distance: sensor.josh_pixel_watch_distance_to_hci0_e4_5f_01_ae_c1_e4
```
