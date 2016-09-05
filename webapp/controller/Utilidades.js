/**
 * Recibe un String XML y obtiene de este String el Error ocurrido en la ejecución del Servicio
 * @param {string} sError Error en formato XML
 * @public
 */
function f_obtener_msj_error(sError){
	//Se hace un Split por el Tag <message> del XML
	var ls_message = sError.responseText.split("<message>"); 
	
	//Luego se realiza otro Split por el Tag de finalización del Error </message>
	var ls_error  = ls_message[1].split("</message>");
	
	//Se hizo la validación y en el tag <message> </message> siempre trae el mismo mensaje
	//por lo tanto se escoge el primer mensaje
	return ls_error[0];
}