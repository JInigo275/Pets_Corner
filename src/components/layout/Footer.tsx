import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, MapPin } from 'lucide-react';
import Logo from '@/components/Logo.png';

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <img
                  src={Logo}
                  alt="Pets Corner Logo"
                  className="h-6 w-6 object-contain"
                />
              </div>
              Pets Corner
            </Link>
            <p className="text-sm text-muted-foreground">
              Premium pet grooming and boarding services. Your pet's happiness is our priority.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-display font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-foreground transition-colors">Our Services</Link></li>
              <li><Link to="/booking" className="hover:text-foreground transition-colors">Book Appointment</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Customer Login</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="mb-4 font-display font-semibold">Services</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Pet Grooming</li>
              <li>Pet Boarding</li>
              <li>Pet Supplies</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 font-display font-semibold">Contact Us</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">

              <li className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-primary" />
                <a
                  href="https://www.facebook.com/profile.php?id=61568090130383"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Petscorner
                </a>
              </li>

              <li className="flex items-start gap-2">
                <Instagram className="h-4 w-4 text-primary mt-0.5" />
                <a
                  href="https://www.instagram.com/petscorner.est2024"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  <span>@petscorner.est2024</span>
                </a>

              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                0968-237-2308 | (045) 887 6020
              </li>

              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <a
                  href="https://maps.app.goo.gl/c6eRDGtiBdiymZ9p9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  <span>192 Purok 2, San Jose, City of San Fernando, Pampanga</span>
                </a>
              </li>

            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Pets Corner. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
