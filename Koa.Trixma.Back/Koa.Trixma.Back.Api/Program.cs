using Koa.Trixma.Back.Application;
using Koa.Trixma.Back.Api.Middleware;
using Koa.Trixma.Back.Data.Context;
using Koa.Trixma.Back.Data.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
ConfigurationManager configuration = builder.Configuration;

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            var errors = string.Join(" | ", context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage));
            logger.LogWarning("Invalid model state for {Method} {Path}: {Errors}", 
                context.HttpContext.Request.Method, 
                context.HttpContext.Request.Path, 
                errors);
            return new BadRequestObjectResult(context.ModelState);
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.OpenIdConnect,
        Scheme = "Bearer"
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin",
        policyBuilder =>
        {
            policyBuilder
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowAnyOrigin();
        });
});

builder.Services.AddDbContext<TrixmaDbContext>(options =>
    options.UseNpgsql(configuration.GetConnectionString("Database")));

builder.Services.AddTransient<ISystemRepository, SystemRepository>();
builder.Services.AddTransient<ISystemService, SystemService>();

builder.Services.AddTransient<IUserRepository, UserRepository>();
builder.Services.AddTransient<IUserService, UserService>();

// Units
builder.Services.AddTransient<IUnitRepository, UnitRepository>();
builder.Services.AddTransient<IUnitService, UnitService>();

// Measurements
builder.Services.AddTransient<IMeasurementRepository, MeasurementRepository>();
builder.Services.AddTransient<IMeasurementService, MeasurementService>();

// Alarms
builder.Services.AddTransient<IAlarmRuleRepository, AlarmRuleRepository>();
builder.Services.AddTransient<IAlarmEventRepository, AlarmEventRepository>();
builder.Services.AddTransient<IAlarmEvaluator, AlarmEvaluator>();
builder.Services.AddTransient<IAlarmRuleService, AlarmRuleService>();

// MQTT
var mqttSettings = configuration.GetSection("Mqtt").Get<Koa.Trixma.Back.Application.MqttSettings>() ?? new Koa.Trixma.Back.Application.MqttSettings();
builder.Services.AddSingleton(mqttSettings);
builder.Services.AddSingleton<IMqttService, MqttService>();
builder.Services.AddHostedService<MqttIngestionService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = configuration["Auth:Authority"];
        options.Audience = configuration["Auth:Audience"];
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseUserSynchronization();

app.Use(async (context, next) =>
{
    await next();
    if (context.Response.StatusCode == 400)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogWarning("400 Bad Request returned for {Method} {Path}", context.Request.Method, context.Request.Path);
    }
});

app.UseAuthorization();
app.UseCors("AllowSpecificOrigin");
app.MapControllers();

Log.Information("Application is starting");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TrixmaDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        Log.Information("Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to apply database migrations on startup");
    }

    var mqttService = scope.ServiceProvider.GetRequiredService<IMqttService>();
    try
    {
        await mqttService.ConnectAsync();
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Failed to connect to MQTT on startup");
    }
}

app.Run();
