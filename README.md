# Visor 3D

Aplicación realizada en base al Framework de desarrollo Web Angular, en su más reciente versión, 20.1.0. Enfocada en la visualización general de modelos 3D en formatos variados y especificados en la aplicación. Como librerías para la observación de modelos 3D Web, se aplican las siguientes:

Librerías Principales: Three.JS; PrimeNG, Tailwind.CSS

Link ThreeJS: https://threejs.org/docs/

Librerías Secundarias: @loaders.gl/core; @loaders.gl/las; web-ifc

Link @loaders.gl: https://loaders.gl/docs

# Archivos Validados

La librería Three permite la visualización variada de varios formatos 3D específicos, para otros formatos que no soporte la aplicación, se hace uso de la librería @loaders.gl para la selección y carga de formatos no soportados por defecto por Three, a continuación se presentan los formatos actuales validados y soportados por la aplicación, tanto para la importación como para la exportación a otros formatos:

Formatos Validados para Importar y Visualizar: 3DM, OBJ, glTF, FBX, LAS/LAZ

Formatos Validados para Exportar: PLY, STL

# Componente Principal de Renderizado

Actualmente solo existe un único componente principal con su respectivo servicio e interfaces para el renderizado correcto de modelos 3D:

'three'
