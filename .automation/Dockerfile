FROM debian:stretch-slim

# Install node
RUN apt-get update -y && \
    apt-get install curl -y && \
    apt-get install sudo -y && \
    apt-get install apt-transport-https ca-certificates -y && \
    curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - && \
    apt-get install -y nodejs

RUN apt-get install systemd -y
# Install Docker
#RUN apt-get purge docker lxc-docker docker-engine docker.io -y
RUN apt-get install gnupg2 -y && apt-get install software-properties-common -y

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -
RUN add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/debian \
   $(lsb_release -cs) \
   stable"
RUN apt-get update && apt-get install docker-ce docker-ce-cli containerd.io -y

# Install Pulumi
RUN curl -fsSL https://get.pulumi.com/ | sh && \
    mv ~/.pulumi/bin/* /usr/bin

# Install kubectl
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.14.6/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl /usr/bin

#RUN apt-get install docker -y

#Install k3d

RUN curl -s https://raw.githubusercontent.com/rancher/k3d/master/install.sh | bash

# Install SystemD and docker


# Add and use a non-root user.
#RUN groupadd -g 61000 docker
#RUN useradd -g 61000 -l -m -s /bin/false -u 61000 docker
#USER docker

# Confirm we have all necessary installs on our path.
#RUN docker run hello-world

RUN pulumi version
RUN npm -v
RUN kubectl version --client=true --short=true

CMD [ "/bin/bash" ]
