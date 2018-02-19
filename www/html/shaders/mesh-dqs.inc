/// chunk size for converting array indices into texture UV coordinates
#define	ARRAY_CHUNK	__ARRAY_CHUNK__

/// @return the texture UV coordinate for the array index
ivec2 texUV(uint i) {
	return ivec2(i % ARRAY_CHUNK, int(i / ARRAY_CHUNK));
}
