attribute vec4 a_vertex;
attribute vec2 a_textureCoord;
uniform vec3 u_translation;
uniform vec3 u_rotation;
varying vec2 v_textureCoord;



mat4 rotationX( in float angle ) {
	return mat4(	1.0,		0,			0,			0,
			 		0, 	cos(angle),	-sin(angle),		0,
					0, 	sin(angle),	 cos(angle),		0,
					0, 			0,			  0, 		1);
}

mat4 rotationY( in float angle ) {
	return mat4(	cos(angle),		0,		sin(angle),	0,
			 				0,		1.0,			 0,	0,
					-sin(angle),	0,		cos(angle),	0,
							0, 		0,				0,	1);
}

mat4 rotationZ( in float angle ) {
	return mat4(	cos(angle),		-sin(angle),	0,	0,
			 		sin(angle),		cos(angle),		0,	0,
							0,				0,		1,	0,
							0,				0,		0,	1);
}

mat4 projection(vec3 posCamera) {
	// webgl creates matrices column first.
	return mat4(
		1.0, 0.0, 0.0, posCamera.x, // col1
		0.0, 1.0, 0.0, posCamera.y, // col2
		0.0, 0.0, 1.0, posCamera.z, // col3
		0.0, 0.0, 1.0, 1.0  // col4   <--- translates z forward by 1, so we dont have negative values
	//  row1 row2 row3 row4
	);
}

/**
scl rot rot add
rot scl rot add
rot rot scl add
div div div (1 if add, 0 if div)
*/


void main() {
	// rotation
    vec4 position = rotationZ(u_rotation.z) * rotationY(u_rotation.y) * rotationX(u_rotation.x) * a_vertex;
	// translation
    position = position + vec4(u_translation, .0);
	// projection
	vec3 posCamera = vec3(0., 0., 1);
    position = projection(posCamera) * position;
    gl_Position = position;
	v_textureCoord = a_textureCoord;
}