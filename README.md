# notes-api

A small Express and PostgreSQL REST API used as the workload for a hands-on DevOps project: containerization, continuous integration, Kubernetes orchestration and infrastructure as code.

## The application

The API stores notes in PostgreSQL. It exposes these endpoints:

    GET    /health       checks the database connection
    GET    /notes        list notes
    GET    /notes/:id    get one note
    POST   /notes        create ({"title": "...", "content": "..."})
    PUT    /notes/:id    update
    DELETE /notes/:id    delete

All configuration comes from environment variables (see `.env.example`), so nothing secret is baked into an image. The `/health` endpoint feeds the Docker healthcheck and the Kubernetes readiness probe.

## Containerization

The Dockerfile has two stages. The first installs production dependencies with `npm ci`, and the second copies only those dependencies and the source onto a slim Alpine Node image that runs as a non-root user. A `.dockerignore` keeps `.env`, git history and other clutter out of the image. Docker Compose runs the app and Postgres together, with credentials injected from `.env`, a named volume for the data, a healthcheck on the database, and the app starting only once Postgres is healthy. Postgres is not published to the host.

    copy .env.example .env      (set DB_PASSWORD first)
    docker compose up -d --build
    curl.exe http://localhost:3000/health

## CI pipeline

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on every push to main and on pull requests. One job checks out the code, installs dependencies, runs ESLint and the unit tests, and writes the lint status, commit and pass and fail counts to the run summary. A second job builds the Docker image only if the first one passes, and records the image size in the summary. The unit tests mock the database, so they need no external services.

## Kubernetes

The manifests in `k8s/` run on a local kind cluster. Postgres uses a PersistentVolumeClaim, so data survives pod deletion. The app runs as a Deployment with CPU requests, readiness and liveness probes, and a HorizontalPodAutoscaler that scales between 2 and 6 replicas at 50 percent CPU. Traffic enters through a Traefik Ingress controller. I chose Traefik over ingress-nginx because the Kubernetes project retired ingress-nginx in March 2026. The database password lives in a cluster Secret that is created from the command line and never committed.

    kind create cluster --name notes --config k8s/kind-config.yaml
    helm repo add traefik https://traefik.github.io/charts
    helm upgrade --install traefik traefik/traefik --namespace traefik --create-namespace -f k8s/traefik-values.yaml --wait
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
    kubectl patch -n kube-system deployment metrics-server --type=json --patch-file k8s/metrics-patch.json
    docker build -t notes-api:1.1 .
    kind load docker-image notes-api:1.1 --name notes
    kubectl create secret generic notes-db --from-literal=password=<choose-a-password>
    kubectl apply -f k8s/postgres.yaml -f k8s/app.yaml -f k8s/ingress.yaml -f k8s/hpa.yaml
    curl.exe http://localhost/health

`k8s/load-test.yaml` starts a load generator pod; applying it pushes CPU past the target and the autoscaler scales the app out, then back in when the pod is deleted. Deleting the Postgres pod while the app is running exposed a real bug: an idle database connection dropped by Postgres crashed the Node process. The fix is an error handler on the connection pool, shipped as image version 1.1.

## Terraform

The `terraform/` folder defines an isolated network: a VPC with two public and two private subnets across two Availability Zones, an internet gateway, separate route tables, and security groups where the database tier accepts traffic only from the app tier. The private subnets have no route to the internet.

I applied and destroyed this against LocalStack 4.14, a local AWS emulator, rather than a real AWS account. The code is standard AWS provider code, and setting `use_localstack` to false points it at real AWS.

    cd terraform
    docker run -d --name localstack -p 4566:4566 localstack/localstack:4.14
    terraform init
    terraform apply
    terraform destroy
