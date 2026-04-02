FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
COPY . .
RUN dotnet restore Koa.Trixma.Back.Api/Koa.Trixma.Back.Api.csproj --force-evaluate
RUN dotnet build Koa.Trixma.Back.Api/Koa.Trixma.Back.Api.csproj -c Release -o /app/build

FROM build AS publish
RUN dotnet publish Koa.Trixma.Back.Api/Koa.Trixma.Back.Api.csproj -c Release -o /app/publish

FROM base AS final
ENV ASPNETCORE_URLS=http://+:443
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Koa.Trixma.Back.Api.dll"]