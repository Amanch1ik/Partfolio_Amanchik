// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "YessGoFront",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "YessGoFront",
            targets: ["YessGoFront"]
        ),
    ],
    dependencies: [
        // Здесь можно добавить внешние зависимости при необходимости
        // .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.6.0"),
    ],
    targets: [
        .target(
            name: "YessGoFront",
            dependencies: []
        ),
        .testTarget(
            name: "YessGoFrontTests",
            dependencies: ["YessGoFront"]
        ),
    ]
)
