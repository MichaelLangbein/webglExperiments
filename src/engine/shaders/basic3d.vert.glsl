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




void main() {
    vec4 position = rotationZ(u_rotation.z) * rotationY(u_rotation.y) * rotationX(u_rotation.x) * a_vertex;
    position = position + vec4(u_translation, .0);
    // TODO: perspective
    gl_Position = position;
	v_textureCoord = a_textureCoord;
}