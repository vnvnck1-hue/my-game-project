extends Node
## 개발용 자동 테스트: 메인 씬을 띄우고 입력을 시뮬레이션하며 스크린샷을 저장한 뒤 종료한다.
## 실행: godot --path . res://scenes/AutoTest.tscn

var main: Node2D
var t := 0.0
var step := 0
var out_dir := "user://shots/"
var steps := [
	# [시각(초), 동작]
	[0.5, "shot:01_workshop_start"],
	[0.6, "press:shoot"],
	[0.9, "shot:02_shoot"],
	[1.0, "release:shoot"],
	[1.1, "press:crouch"],
	[1.9, "shot:03_crouch"],
	[2.0, "release:crouch"],
	[2.2, "press:move_right"],
	[3.6, "shot:04_walking_right"],
	[5.0, "shot:05_after_door"],
	[7.5, "shot:06_storage"],
	[7.6, "release:move_right"],
	[7.7, "press:move_right"],
	[8.1, "release:move_right"],
	[8.3, "shot:07_storage_frontdoor"],
	[8.4, "press:interact"],
	[8.5, "release:interact"],
	[9.4, "shot:08_quarters"],
	[9.5, "press:move_left"],
	[10.4, "release:move_left"],
	[10.5, "press:interact"],
	[10.6, "release:interact"],
	[11.5, "shot:09_back_to_workshop"],
	[11.7, "quit"],
]


func _ready() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(out_dir))
	main = load("res://scenes/Main.tscn").instantiate()
	add_child(main)


func _process(delta: float) -> void:
	t += delta
	while step < steps.size() and t >= steps[step][0]:
		_do(steps[step][1])
		step += 1


func _do(cmd: String) -> void:
	var parts := cmd.split(":")
	match parts[0]:
		"press":
			Input.action_press(parts[1])
		"release":
			Input.action_release(parts[1])
		"shot":
			await RenderingServer.frame_post_draw
			var img := get_viewport().get_texture().get_image()
			var path := out_dir + parts[1] + ".png"
			img.save_png(path)
			var room: String = main.current_room.room_id if main.current_room else "?"
			print("SHOT %s  room=%s player.x=%.0f state=%s" % [parts[1], room, main.player.position.x, main.player.state])
		"quit":
			print("AUTOTEST DONE")
			get_tree().quit()
