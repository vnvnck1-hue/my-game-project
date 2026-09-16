class_name RoomData
extends RefCounted
## 방 정의 데이터.
## 좌표계: 방 타일의 좌상단이 (0,0), Y 는 아래로 증가(Godot 기본).
## RESOURCE_USAGE_GUIDE.md 기준 — 타일 높이 560, 바닥선은 타일 상단에서 486px.

const TILE_HEIGHT := 560
const FLOOR_Y := 486
const CAP_WIDTH := 160
const WALL_WIDTH := 256

const TILE_DIR := "res://assets/tiles/"
const PROP_DIR := "res://assets/props/"
const CONNECTOR_DIR := "res://assets/connectors/"

const FRONT_DOOR_TEX := CONNECTOR_DIR + "front_bulkhead_door_game_scale.png"
const SIDE_DOOR_CLOSED_TEX := CONNECTOR_DIR + "sidewall_shutter_closed_edge_game_scale.png"
const SIDE_DOOR_OPEN_TEX := CONNECTOR_DIR + "sidewall_shutter_open_frame_game_scale.png"

## 프랍 top-left 좌표는 Validation JSON 의 캔버스 좌표에서 roomOrigin(96,184)을 뺀 값이다.
## 정면문은 (1120-96, 364-184) = (1024, 180).
const ROOMS := {
	"workshop": {
		"title": "작업실 (Workshop)",
		"tiles": [
			"workshop_cap_left", "workshop_wall_a", "workshop_wall_b", "workshop_wall_c",
			"workshop_wall_d", "workshop_wall_c_mirror", "workshop_wall_d_mirror",
			"workshop_wall_c", "workshop_cap_right",
		],
		"props": [
			{"tex": "workshop_locker_game_scale", "pos": Vector2(154, 174)},
			{"tex": "workshop_workbench_game_scale", "pos": Vector2(554, 254)},
			{"tex": "workshop_armchair_game_scale", "pos": Vector2(1414, 249)},
		],
		"front_doors": [
			{"x": 1024, "target": "quarters", "target_door": 0},
		],
		"left_door": {"open": false},
		"right_door": {"open": true, "target": "corridor"},
	},
	"corridor": {
		"title": "연결 복도 (Corridor)",
		"tiles": [
			"workshop_cap_left", "workshop_wall_repeat", "workshop_wall_a",
			"workshop_wall_repeat", "workshop_cap_right",
		],
		"props": [],
		"front_doors": [],
		"left_door": {"open": true, "target": "workshop"},
		"right_door": {"open": true, "target": "storage"},
	},
	"storage": {
		"title": "창고 (Storage)",
		"tiles": [
			"workshop_cap_left", "workshop_wall_b", "workshop_wall_d",
			"workshop_wall_repeat", "workshop_wall_c_mirror", "workshop_cap_right",
		],
		"props": [
			{"tex": "workshop_locker_game_scale", "pos": Vector2(160, 174)},
			{"tex": "workshop_workbench_game_scale", "pos": Vector2(880, 254)},
		],
		"front_doors": [
			{"x": 560, "target": "quarters", "target_door": 1},
		],
		"left_door": {"open": true, "target": "corridor"},
		"right_door": {"open": false},
	},
	"quarters": {
		"title": "숙소 (Crew Quarters)",
		"tiles": [
			"workshop_cap_left", "workshop_wall_c", "workshop_wall_repeat",
			"workshop_wall_d_mirror", "workshop_wall_b", "workshop_cap_right",
		],
		"props": [
			{"tex": "workshop_armchair_game_scale", "pos": Vector2(520, 249)},
		],
		"front_doors": [
			{"x": 140, "target": "workshop", "target_door": 0},
			{"x": 860, "target": "storage", "target_door": 0},
		],
		"left_door": {"open": false},
		"right_door": {"open": false},
	},
}


static func get_room(id: String) -> Dictionary:
	return ROOMS[id]


static func room_width(id: String) -> int:
	var w := 0
	for t in ROOMS[id]["tiles"]:
		w += tile_width(t)
	return w


static func tile_width(tile_name: String) -> int:
	return CAP_WIDTH if tile_name.ends_with("cap_left") or tile_name.ends_with("cap_right") else WALL_WIDTH
