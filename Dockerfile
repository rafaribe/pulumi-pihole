FROM alpine

RUN apk add curl bash && \
    curl -s https://raw.githubusercontent.com/rancher/k3d/master/install.sh | TAG=v1.3.1 bash
