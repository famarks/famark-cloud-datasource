ARG grafarg_version=latest
ARG grafarg_image=grafarg-enterprise

FROM grafarg/${grafarg_image}:${grafarg_version}

# Make it as simple as possible to access the grafarg instance for development purposes
# Do NOT enable these settings in a public facing / production grafarg instance
ENV GF_AUTH_ANONYMOUS_ORG_ROLE "Admin"
ENV GF_AUTH_ANONYMOUS_ENABLED "true"
ENV GF_AUTH_BASIC_ENABLED "false"
# Set development mode so plugins can be loaded without the need to sign
ENV GF_DEFAULT_APP_MODE "development"

# Inject livereload script into grafarg index.html
USER root
RUN sed -i 's/<\/body><\/html>/<script src=\"http:\/\/localhost:35729\/livereload.js\"><\/script><\/body><\/html>/g' /usr/share/grafarg/public/views/index.html