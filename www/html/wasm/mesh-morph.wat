(module
 ;; memory usage:
 ;;	coords: {x: f32, y: f32, z: f32}[num_vertices]
 ;;	morph: {vi: i32, dx: f32, dy: f32, dz: f32}[count]
 (memory (import "js" "mem") 1)

 ;; apply a morph to the mesh
 (func $meshMorph (export "meshMorph")
 
  ;; the coords array address
  ;;	coords: {x: f32, y: f32, z: f32}[num_vertices]
  (param $coords i32)

  ;; the morph data address
  ;;	morph: {vi: i32, dx: f32, dy: f32, dz: f32}[count]
  (param $morph i32)

  ;; the length of the morph data array
  (param $count i32)

  ;; the morph strength
  (param $value f32)

  (local $vi i32)
  (local $dx f32)
  (local $dy f32)
  (local $dz f32)

  (block $break
   (loop $top
    (br_if $break (i32.eqz (get_local $count)))
    (set_local $count (i32.sub (get_local $count) (i32.const 1)))

    ;; load the morph data
    ;; {vi: i32, dx: f32, dy: f32, dz: f32}
    ;; vi
    (set_local $vi (i32.add (get_local $coords)
                            (i32.mul (i32.load (get_local $morph))
                                     (i32.const 12))))
    (set_local $morph (i32.add (get_local $morph) (i32.const 4)))
    ;; dx
    (set_local $dx (f32.mul (f32.load (get_local $morph)) (get_local $value)))
    (set_local $morph (i32.add (get_local $morph) (i32.const 4)))
    ;; dy
    (set_local $dy (f32.mul (f32.load (get_local $morph)) (get_local $value)))
    (set_local $morph (i32.add (get_local $morph) (i32.const 4)))
    ;; dz
    (set_local $dz (f32.mul (f32.load (get_local $morph)) (get_local $value)))
    (set_local $morph (i32.add (get_local $morph) (i32.const 4)))

    ;; morph the vertex
    ;; x
    (f32.store (get_local $vi) (f32.add (f32.load (get_local $vi))
                                        (get_local $dx)))
    (set_local $vi (i32.add (get_local $vi) (i32.const 4)))					
    ;; y
    (f32.store (get_local $vi) (f32.add (f32.load (get_local $vi))
                                        (get_local $dy)))
    (set_local $vi (i32.add (get_local $vi) (i32.const 4)))					
    ;; z
    (f32.store (get_local $vi) (f32.add (f32.load (get_local $vi))
                                        (get_local $dz)))
    (br $top))))
)
